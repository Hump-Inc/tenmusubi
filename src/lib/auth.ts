import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Line from "next-auth/providers/line";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { cookies } from "next/headers";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import { checkRateLimit, RATE_LIMITS } from "./rateLimit";
import { getClientIp } from "./clientIp";

// ログイン画面は result.code で見分けて、回数制限の案内を出す
class LoginRateLimited extends CredentialsSignin {
  code = "rate_limited";
}

// カスタムアダプター: メールベースのアカウントリンクをサポート
function CustomPrismaAdapter(): Adapter {
  const baseAdapter = PrismaAdapter(prisma);

  return {
    ...baseAdapter,

    // getUserByEmailをオーバーライド
    // OAuthサインイン時に既存ユーザーが見つかってもnullを返すことで、
    // createUser → linkAccountの流れに持っていく
    async getUserByEmail(email: string) {
      // OAuthフローでは、ここでnullを返すことで
      // createUserが呼ばれるようにする
      // createUser内で既存ユーザーをチェックして返す
      return null;
    },

    // getUserByAccountをオーバーライド
    // provider + providerAccountIdで見つからない場合でも、
    // メールアドレスで既存ユーザーを探す
    async getUserByAccount(providerAccountId) {
      // まず標準の方法でアカウントを探す
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: providerAccountId.provider,
            providerAccountId: providerAccountId.providerAccountId,
          },
        },
        include: { user: true },
      });

      if (account) {
        return account.user as AdapterUser;
      }

      return null;
    },

    // createUserをオーバーライドして、既存ユーザーがいる場合はそのユーザーを返す
    async createUser(data: AdapterUser) {
      // メールアドレスで既存ユーザーを検索
      if (data.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: data.email },
        });

        if (existingUser) {
          // 既存ユーザーを返す（新規作成しない）
          return existingUser as AdapterUser;
        }
      }

      // 既存ユーザーがいない場合は新規作成
      return baseAdapter.createUser!(data);
    },

    // linkAccountをオーバーライドして、重複を避ける
    async linkAccount(account) {
      // 既存のアカウントリンクを確認
      const existingAccount = await prisma.account.findFirst({
        where: {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        },
      });

      if (existingAccount) {
        // 既にリンクされている場合は何もしない
        return;
      }

      // 同じユーザーに同じプロバイダーのアカウントがないか確認
      const userAccount = await prisma.account.findFirst({
        where: {
          userId: account.userId,
          provider: account.provider,
        },
      });

      if (userAccount) {
        // 既にこのプロバイダーでリンクされている場合は更新
        await prisma.account.update({
          where: { id: userAccount.id },
          data: {
            providerAccountId: account.providerAccountId,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
          },
        });
        return;
      }

      // 新規リンク
      await baseAdapter.linkAccount!(account);
    },
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: CustomPrismaAdapter(),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Line({
      clientId: process.env.LINE_CLIENT_ID!,
      clientSecret: process.env.LINE_CLIENT_SECRET!,
    }),
    // Credentials provider for email/password login (optional)
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // パスワードの総当たり対策。1つのアカウントへの集中と、1つのIPからの
        // 多数アカウントへの試行の両方を止める（Stripe のセキュリティ申告の対象）
        const email = (credentials.email as string).trim().toLowerCase();
        const ip = getClientIp(request.headers);
        const [byEmail, byIp] = await Promise.all([
          checkRateLimit("login-email", email, RATE_LIMITS.loginPerEmail.limit, RATE_LIMITS.loginPerEmail.windowSeconds),
          checkRateLimit("login-ip", ip, RATE_LIMITS.loginPerIp.limit, RATE_LIMITS.loginPerIp.windowSeconds),
        ]);
        if (!byEmail.ok || !byIp.ok) {
          throw new LoginRateLimited();
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    newUser: "/profile/edit",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      if (account) {
        token.provider = account.provider;
      }

      // emailVerified, isAdmin, subscriptionPlanをトークンに追加
      if (user) {
        // 初回: DBから取得
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id as string },
          select: { emailVerified: true, isAdmin: true, subscription: true },
        });
        token.emailVerified = dbUser?.emailVerified?.toISOString() ?? null;
        token.isAdmin = dbUser?.isAdmin ?? false;
        const sub = dbUser?.subscription;
        token.subscriptionPlan =
          sub?.status === "active" && sub.stripeCurrentPeriodEnd.getTime() > Date.now()
            ? "premium"
            : "free";
      } else if (!token.emailVerified) {
        // 未認証時はリクエストごとにDBから再取得（認証完了を即反映）
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { emailVerified: true, isAdmin: true, subscription: true },
        });
        token.emailVerified = dbUser?.emailVerified?.toISOString() ?? null;
        token.isAdmin = dbUser?.isAdmin ?? false;
        const sub = dbUser?.subscription;
        token.subscriptionPlan =
          sub?.status === "active" && sub.stripeCurrentPeriodEnd.getTime() > Date.now()
            ? "premium"
            : "free";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).emailVerified = token.emailVerified ?? null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).isAdmin = token.isAdmin ?? false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).subscriptionPlan = token.subscriptionPlan ?? "free";
      }
      return session;
    },
    async signIn({ user, account }) {
      // OAuth認証時にemailVerifiedを自動設定
      if (account && account.provider !== "credentials" && user.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { emailVerified: true },
        });
        if (!dbUser?.emailVerified) {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        }
      }

      // アカウントリンクモードの確認
      const cookieStore = await cookies();
      const linkUserId = cookieStore.get("link_user_id")?.value;

      if (linkUserId && account) {
        // アカウントリンクモード: 既存ユーザーにアカウントを追加
        try {
          // 同じプロバイダーアカウントが既に存在するか確認
          const existingAccount = await prisma.account.findFirst({
            where: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          });

          if (existingAccount) {
            // 既に他のユーザーに紐付いている場合はエラー
            return "/settings/account?error=already_linked";
          }

          // 既存ユーザーにアカウントを追加
          await prisma.account.create({
            data: {
              userId: linkUserId,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
            },
          });

          // 新しく作成されたユーザーを削除（OAuthで自動作成された場合）
          if (user.id && user.id !== linkUserId) {
            await prisma.user.delete({
              where: { id: user.id },
            }).catch(() => {
              // ユーザーが存在しない場合は無視
            });
          }

          return "/settings/account?success=linked";
        } catch (error) {
          console.error("Account link error:", error);
          return "/settings/account?error=link_failed";
        }
      }

      // 通常のサインイン
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      // Create a profile when a new user is created via OAuth
      if (user.id) {
        // cookieからuserTypeを取得
        const cookieStore = await cookies();
        const registerUserType = cookieStore.get("register_user_type")?.value;

        // userTypeが有効な値の場合は設定
        if (registerUserType && ["vendor", "owner"].includes(registerUserType)) {
          await prisma.user.update({
            where: { id: user.id },
            data: { userType: JSON.stringify([registerUserType]) },
          });
        }

        const existingProfile = await prisma.profile.findUnique({
          where: { userId: user.id },
        });

        if (!existingProfile) {
          await prisma.profile.create({
            data: {
              userId: user.id,
              displayName: user.name || "名前未設定",
            },
          });
        }
      }
    },
  },
});

// Type extensions for next-auth
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      emailVerified: string | null;
      isAdmin: boolean;
      subscriptionPlan: "free" | "premium";
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    provider?: string;
    emailVerified?: string | null;
    isAdmin?: boolean;
    subscriptionPlan?: "free" | "premium";
  }
}

// 管理者チェック用ヘルパー関数
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  return (user as { isAdmin?: boolean } | null)?.isAdmin === true;
}

// 管理者認証が必要なAPIで使用するヘルパー
export async function requireAdmin(userId: string): Promise<{ isAdmin: true } | { error: string; status: number }> {
  const admin = await isAdmin(userId);
  if (!admin) {
    return { error: "管理者権限が必要です", status: 403 };
  }
  return { isAdmin: true };
}
