import { config } from "dotenv";
config();

import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Get the local schema DDL and apply missing parts to production
async function main() {
  console.log("Checking production schema...\n");

  // Get existing tables
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'");
  const existingTables = new Set(tables.rows.map(r => r.name as string));
  console.log("Existing tables:", [...existingTables].join(", "));

  // Define all tables that should exist
  const createStatements: string[] = [
    `CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT,
      "email" TEXT,
      "emailVerified" DATETIME,
      "image" TEXT,
      "password" TEXT,
      "userType" TEXT,
      "isAdmin" BOOLEAN NOT NULL DEFAULT false,
      "notificationSettings" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "stripeCustomerId" TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS "Account" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "providerAccountId" TEXT NOT NULL,
      "refresh_token" TEXT,
      "access_token" TEXT,
      "expires_at" INTEGER,
      "token_type" TEXT,
      "scope" TEXT,
      "id_token" TEXT,
      "session_state" TEXT,
      CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "Session" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sessionToken" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "expires" DATETIME NOT NULL,
      CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "VerificationToken" (
      "identifier" TEXT NOT NULL,
      "token" TEXT NOT NULL,
      "expires" DATETIME NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "Profile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "displayName" TEXT NOT NULL,
      "description" TEXT,
      "category" TEXT,
      "area" TEXT,
      "tags" TEXT,
      "website" TEXT,
      "instagram" TEXT,
      "twitter" TEXT,
      "isVerified" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "ProfileImage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "profileId" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "ProfileImage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "Store" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ownerId" TEXT,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "category" TEXT,
      "area" TEXT,
      "tags" TEXT,
      "ownerIntro" TEXT,
      "recommendedItems" TEXT,
      "commitment" TEXT,
      "calendarImageUrl" TEXT,
      "availableAreas" TEXT,
      "newsText" TEXT,
      "newsImageUrl" TEXT,
      "messageToOwners" TEXT,
      "motto" TEXT,
      "website" TEXT,
      "instagram" TEXT,
      "twitter" TEXT,
      "qrToken" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT false,
      "draftData" TEXT,
      "claimEmail" TEXT,
      "claimStatus" TEXT NOT NULL DEFAULT 'none',
      "invitedAt" DATETIME,
      "claimedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Store_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "StoreImage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "storeId" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      "isDraft" BOOLEAN NOT NULL DEFAULT false,
      CONSTRAINT "StoreImage_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "Space" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ownerId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "location" TEXT NOT NULL,
      "address" TEXT,
      "capacity" TEXT,
      "price" TEXT,
      "tags" TEXT,
      "facilities" TEXT,
      "openingHours" TEXT,
      "closedDays" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "SpaceImage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "spaceId" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "SpaceImage_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "Message" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "senderId" TEXT NOT NULL,
      "receiverId" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "isRead" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "Favorite" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "spaceId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Favorite_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "Review" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "rating" INTEGER NOT NULL,
      "content" TEXT,
      "authorId" TEXT NOT NULL,
      "targetId" TEXT NOT NULL,
      "spaceId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Review_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Review_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "Booking" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "vendorId" TEXT NOT NULL,
      "spaceId" TEXT NOT NULL,
      "date" DATETIME NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "message" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "VerificationRequest" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "documentType" TEXT NOT NULL,
      "documentUrl" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "note" TEXT,
      "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "reviewedAt" DATETIME,
      "reviewedBy" TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS "Notification" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "link" TEXT,
      "isRead" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "FaqItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "question" TEXT NOT NULL,
      "answer" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'general',
      "order" INTEGER NOT NULL DEFAULT 0,
      "isPublished" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "PreRegistration" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "userType" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "Subscription" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "stripeSubscriptionId" TEXT NOT NULL,
      "stripePriceId" TEXT NOT NULL,
      "stripeCurrentPeriodEnd" DATETIME NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "CheckIn" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "storeId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CheckIn_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "StoreReview" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "storeId" TEXT NOT NULL,
      "rating" INTEGER NOT NULL,
      "content" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoreReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "StoreReview_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "StoreFavorite" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "storeId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoreFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "StoreFavorite_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "PointTransaction" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "points" INTEGER NOT NULL,
      "type" TEXT NOT NULL,
      "refId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PointTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "BlogPost" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "slug" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "excerpt" TEXT,
      "content" TEXT NOT NULL DEFAULT '',
      "coverImage" TEXT,
      "category" TEXT,
      "tags" TEXT,
      "isPublished" BOOLEAN NOT NULL DEFAULT false,
      "publishedAt" DATETIME,
      "authorId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "StoreClaimRequest" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "storeId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "message" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "reviewedAt" DATETIME,
      "reviewedBy" TEXT,
      CONSTRAINT "StoreClaimRequest_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "StoreClaimRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    // ---- 出店申込パック（共有URL機能） ----
    `CREATE TABLE IF NOT EXISTS "StoreApplicationProfile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "storeId" TEXT NOT NULL,
      "phone" TEXT,
      "contactEmail" TEXT,
      "openedOn" TEXT,
      "appeal" TEXT,
      "vehicleType" TEXT,
      "vehicleWeightKg" INTEGER,
      "plateNumber" TEXT,
      "plateNumberPublic" BOOLEAN NOT NULL DEFAULT false,
      "powerWatt" INTEGER,
      "hasGenerator" BOOLEAN NOT NULL DEFAULT false,
      "generatorModel" TEXT,
      "generatorNoiseDb" INTEGER,
      "usesFire" BOOLEAN NOT NULL DEFAULT false,
      "fireType" TEXT,
      "waterTankLiter" INTEGER,
      "minSpaceWidthM" REAL,
      "minSpaceDepthM" REAL,
      "maxServingsPerHour" INTEGER,
      "secondsPerServing" INTEGER,
      "availableDays" TEXT,
      "hasPrepKitchen" BOOLEAN NOT NULL DEFAULT false,
      "prepKitchenNote" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoreApplicationProfile_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "ApplicationDocument" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "storeId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "label" TEXT,
      "fileKey" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "fileSize" INTEGER NOT NULL,
      "expiresOn" DATETIME,
      "visibility" TEXT NOT NULL DEFAULT 'meta_only',
      "order" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ApplicationDocument_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "ApplicationMenuItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "storeId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "price" INTEGER,
      "description" TEXT,
      "imageUrl" TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ApplicationMenuItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "ShareLink" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "storeId" TEXT NOT NULL,
      "token" TEXT NOT NULL,
      "label" TEXT,
      "expiresAt" DATETIME,
      "passwordHash" TEXT,
      "revokedAt" DATETIME,
      "viewCount" INTEGER NOT NULL DEFAULT 0,
      "printCount" INTEGER NOT NULL DEFAULT 0,
      "lastViewedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ShareLink_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "ShareLinkView" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "shareLinkId" TEXT NOT NULL,
      "kind" TEXT NOT NULL DEFAULT 'page',
      "ipHash" TEXT NOT NULL,
      "uaHash" TEXT NOT NULL,
      "referer" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ShareLinkView_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "ShareLink" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "SpaceLead" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "shareLinkId" TEXT,
      "storeId" TEXT,
      "spaceName" TEXT NOT NULL,
      "area" TEXT,
      "contactName" TEXT NOT NULL,
      "contactEmail" TEXT,
      "contactPhone" TEXT,
      "note" TEXT,
      "status" TEXT NOT NULL DEFAULT 'new',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SpaceLead_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "ShareLink" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "SpaceLead_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "RateLimitCounter" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "count" INTEGER NOT NULL DEFAULT 1,
      "expiresAt" DATETIME NOT NULL
    )`,
    // ---- イベント出店募集 ----
    `CREATE TABLE IF NOT EXISTS "OrganizerProfile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "orgName" TEXT NOT NULL,
      "contactName" TEXT,
      "phone" TEXT,
      "website" TEXT,
      "intro" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "note" TEXT,
      "reviewedAt" DATETIME,
      "reviewedBy" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OrganizerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "Event" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizerId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "venueName" TEXT NOT NULL,
      "address" TEXT,
      "area" TEXT NOT NULL,
      "startAt" DATETIME NOT NULL,
      "endAt" DATETIME NOT NULL,
      "applicationOpenAt" DATETIME,
      "applicationCloseAt" DATETIME,
      "slots" INTEGER,
      "exhibitFee" INTEGER NOT NULL,
      "feeNote" TEXT,
      "spaceWidthM" REAL,
      "spaceDepthM" REAL,
      "powerAvailable" BOOLEAN NOT NULL DEFAULT false,
      "powerWatt" INTEGER,
      "waterAvailable" BOOLEAN NOT NULL DEFAULT false,
      "fireAllowed" BOOLEAN NOT NULL DEFAULT false,
      "categories" TEXT,
      "requiredDocuments" TEXT,
      "expectedVisitors" INTEGER,
      "note" TEXT,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "publishedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "OrganizerProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "EventImage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "eventId" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "EventImage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "EventApplication" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "eventId" TEXT NOT NULL,
      "storeId" TEXT NOT NULL,
      "kind" TEXT NOT NULL DEFAULT 'application',
      "status" TEXT NOT NULL DEFAULT 'open',
      "snapshot" TEXT,
      "message" TEXT,
      "documentRequestedAt" DATETIME,
      "confirmedAt" DATETIME,
      "closedAt" DATETIME,
      "lastMessageAt" DATETIME,
      "vendorLastReadAt" DATETIME,
      "organizerLastReadAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EventApplication_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "EventApplication_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "EventApplicationMessage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "applicationId" TEXT NOT NULL,
      "senderId" TEXT,
      "kind" TEXT NOT NULL DEFAULT 'text',
      "body" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EventApplicationMessage_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "EventApplication" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "EventApplicationMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "EventApplicationDocument" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "applicationId" TEXT NOT NULL,
      "documentId" TEXT NOT NULL,
      "disclosedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "revokedAt" DATETIME,
      CONSTRAINT "EventApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "EventApplication" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "EventApplicationDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ApplicationDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
  ];

  // Add missing columns to existing tables
  const alterStatements: string[] = [];

  // Check User table for missing columns
  if (existingTables.has("User")) {
    const userCols = await client.execute("PRAGMA table_info('User')");
    const colNames = new Set(userCols.rows.map(r => r.name as string));
    if (!colNames.has("notificationSettings")) alterStatements.push('ALTER TABLE "User" ADD COLUMN "notificationSettings" TEXT');
    if (!colNames.has("stripeCustomerId")) alterStatements.push('ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT');
    if (!colNames.has("totalPoints")) alterStatements.push('ALTER TABLE "User" ADD COLUMN "totalPoints" INTEGER NOT NULL DEFAULT 0');
  }

  // Check Store table for missing columns
  if (existingTables.has("Store")) {
    const storeCols = await client.execute("PRAGMA table_info('Store')");
    const colNames = new Set(storeCols.rows.map(r => r.name as string));
    if (!colNames.has("ownerIntro")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "ownerIntro" TEXT');
    if (!colNames.has("recommendedItems")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "recommendedItems" TEXT');
    if (!colNames.has("commitment")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "commitment" TEXT');
    if (!colNames.has("calendarImageUrl")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "calendarImageUrl" TEXT');
    if (!colNames.has("availableAreas")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "availableAreas" TEXT');
    if (!colNames.has("newsText")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "newsText" TEXT');
    if (!colNames.has("newsImageUrl")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "newsImageUrl" TEXT');
    if (!colNames.has("messageToOwners")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "messageToOwners" TEXT');
    if (!colNames.has("motto")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "motto" TEXT');
    if (!colNames.has("qrToken")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "qrToken" TEXT');
    if (!colNames.has("draftData")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "draftData" TEXT');
    if (!colNames.has("vehicleLength")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "vehicleLength" INTEGER');
    if (!colNames.has("vehicleWidth")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "vehicleWidth" INTEGER');
    if (!colNames.has("vehicleHeight")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "vehicleHeight" INTEGER');
    if (!colNames.has("claimEmail")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "claimEmail" TEXT');
    if (!colNames.has("claimStatus")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "claimStatus" TEXT NOT NULL DEFAULT \'none\'');
    if (!colNames.has("invitedAt")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "invitedAt" DATETIME');
    if (!colNames.has("claimedAt")) alterStatements.push('ALTER TABLE "Store" ADD COLUMN "claimedAt" DATETIME');
  }

  // Check StoreImage table for missing columns
  if (existingTables.has("StoreImage")) {
    const storeImageCols = await client.execute("PRAGMA table_info('StoreImage')");
    const colNames = new Set(storeImageCols.rows.map(r => r.name as string));
    if (!colNames.has("isDraft")) alterStatements.push('ALTER TABLE "StoreImage" ADD COLUMN "isDraft" BOOLEAN NOT NULL DEFAULT false');
  }

  // Execute creates
  for (const sql of createStatements) {
    try {
      await client.execute(sql);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("already exists")) {
        console.error("Error:", msg);
      }
    }
  }

  // Execute alters
  for (const sql of alterStatements) {
    try {
      await client.execute(sql);
      console.log("  Applied:", sql.substring(0, 60) + "...");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("duplicate column")) {
        console.error("Error:", msg);
      }
    }
  }

  // ============================================
  // Fix legacy Store.ownerId: NOT NULL → nullable + FK SET NULL
  // 旧定義の本番では Store.ownerId が NOT NULL かつ ON DELETE CASCADE になっており、
  // 管理者が「オーナー未割当」で店舗を作成できない / カスケード削除の挙動も schema と不一致。
  // SQLite は ALTER COLUMN 不可・Turso は writable_schema 不可のためテーブル再構築で修正する。
  // ownerId が既に nullable の場合は何もしない（冪等）。
  if (existingTables.has("Store")) {
    const storeInfo = await client.execute("PRAGMA table_info('Store')");
    const ownerCol = storeInfo.rows.find((r) => r.name === "ownerId");
    if (ownerCol && Number(ownerCol.notnull) === 1) {
      const ddlRes = await client.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='Store'"
      );
      const ddl = ddlRes.rows[0].sql as string;
      const newCreate = ddl
        .replace('CREATE TABLE "Store"', 'CREATE TABLE "Store_new"')
        .replace('"ownerId" TEXT NOT NULL', '"ownerId" TEXT')
        .replace(
          'ON DELETE CASCADE ON UPDATE CASCADE',
          'ON DELETE SET NULL ON UPDATE CASCADE'
        );

      const rebuild = [
        "PRAGMA foreign_keys=OFF",
        newCreate,
        'INSERT INTO "Store_new" SELECT * FROM "Store"',
        'DROP TABLE "Store"',
        'ALTER TABLE "Store_new" RENAME TO "Store"',
        'CREATE UNIQUE INDEX IF NOT EXISTS "Store_qrToken_key" ON "Store"("qrToken")',
        "PRAGMA foreign_keys=ON",
      ].join(";\n") + ";";

      try {
        await client.executeMultiple(rebuild);
        const fk = await client.execute("PRAGMA foreign_key_check");
        console.log(
          `  Rebuilt Store: ownerId is now nullable (FK violations: ${fk.rows.length})`
        );
      } catch (e: unknown) {
        console.error("Store rebuild error:", e instanceof Error ? e.message : String(e));
      }
    }
  }

  // Create unique indexes
  const indexes = [
    'CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "Profile_userId_key" ON "Profile"("userId")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_userId_spaceId_key" ON "Favorite"("userId", "spaceId")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "VerificationRequest_userId_key" ON "VerificationRequest"("userId")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "PreRegistration_email_key" ON "PreRegistration"("email")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_userId_key" ON "Subscription"("userId")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "Store_qrToken_key" ON "Store"("qrToken")',
    'CREATE INDEX IF NOT EXISTS "CheckIn_userId_storeId_idx" ON "CheckIn"("userId", "storeId")',
    'CREATE INDEX IF NOT EXISTS "CheckIn_storeId_idx" ON "CheckIn"("storeId")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "StoreReview_userId_storeId_key" ON "StoreReview"("userId", "storeId")',
    'CREATE INDEX IF NOT EXISTS "StoreReview_storeId_idx" ON "StoreReview"("storeId")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "StoreFavorite_userId_storeId_key" ON "StoreFavorite"("userId", "storeId")',
    'CREATE INDEX IF NOT EXISTS "PointTransaction_userId_idx" ON "PointTransaction"("userId")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "BlogPost_slug_key" ON "BlogPost"("slug")',
    'CREATE INDEX IF NOT EXISTS "BlogPost_isPublished_publishedAt_idx" ON "BlogPost"("isPublished", "publishedAt")',
    'CREATE INDEX IF NOT EXISTS "StoreClaimRequest_storeId_idx" ON "StoreClaimRequest"("storeId")',
    'CREATE INDEX IF NOT EXISTS "StoreClaimRequest_userId_idx" ON "StoreClaimRequest"("userId")',
    'CREATE INDEX IF NOT EXISTS "StoreClaimRequest_status_idx" ON "StoreClaimRequest"("status")',
    // ---- 出店申込パック（共有URL機能） ----
    'CREATE UNIQUE INDEX IF NOT EXISTS "StoreApplicationProfile_storeId_key" ON "StoreApplicationProfile"("storeId")',
    'CREATE INDEX IF NOT EXISTS "ApplicationDocument_storeId_idx" ON "ApplicationDocument"("storeId")',
    'CREATE INDEX IF NOT EXISTS "ApplicationMenuItem_storeId_idx" ON "ApplicationMenuItem"("storeId")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "ShareLink_token_key" ON "ShareLink"("token")',
    'CREATE INDEX IF NOT EXISTS "ShareLink_storeId_idx" ON "ShareLink"("storeId")',
    'CREATE INDEX IF NOT EXISTS "ShareLinkView_shareLinkId_createdAt_idx" ON "ShareLinkView"("shareLinkId", "createdAt")',
    'CREATE INDEX IF NOT EXISTS "SpaceLead_status_idx" ON "SpaceLead"("status")',
    'CREATE INDEX IF NOT EXISTS "SpaceLead_shareLinkId_idx" ON "SpaceLead"("shareLinkId")',
    'CREATE INDEX IF NOT EXISTS "SpaceLead_storeId_idx" ON "SpaceLead"("storeId")',
    'CREATE INDEX IF NOT EXISTS "RateLimitCounter_expiresAt_idx" ON "RateLimitCounter"("expiresAt")',
    // ---- イベント出店募集 ----
    'CREATE UNIQUE INDEX IF NOT EXISTS "OrganizerProfile_userId_key" ON "OrganizerProfile"("userId")',
    'CREATE INDEX IF NOT EXISTS "OrganizerProfile_status_idx" ON "OrganizerProfile"("status")',
    'CREATE INDEX IF NOT EXISTS "Event_status_startAt_idx" ON "Event"("status", "startAt")',
    'CREATE INDEX IF NOT EXISTS "Event_area_idx" ON "Event"("area")',
    'CREATE INDEX IF NOT EXISTS "Event_organizerId_idx" ON "Event"("organizerId")',
    'CREATE INDEX IF NOT EXISTS "EventImage_eventId_idx" ON "EventImage"("eventId")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "EventApplication_eventId_storeId_key" ON "EventApplication"("eventId", "storeId")',
    'CREATE INDEX IF NOT EXISTS "EventApplication_eventId_status_idx" ON "EventApplication"("eventId", "status")',
    'CREATE INDEX IF NOT EXISTS "EventApplication_storeId_idx" ON "EventApplication"("storeId")',
    'CREATE INDEX IF NOT EXISTS "EventApplicationMessage_applicationId_createdAt_idx" ON "EventApplicationMessage"("applicationId", "createdAt")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "EventApplicationDocument_applicationId_documentId_key" ON "EventApplicationDocument"("applicationId", "documentId")',
    'CREATE INDEX IF NOT EXISTS "EventApplicationDocument_applicationId_idx" ON "EventApplicationDocument"("applicationId")',
  ];

  for (const sql of indexes) {
    try {
      await client.execute(sql);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("already exists")) {
        console.error("Index error:", msg);
      }
    }
  }

  console.log("\nSchema migration completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    client.close();
  });
