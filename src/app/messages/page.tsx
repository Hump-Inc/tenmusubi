"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Search,
  Send,
  MoreVertical,
  ChevronLeft,
  Loader2,
  MessageCircle,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const CONVERSATION_POLL_INTERVAL = 30000; // 30秒
const MESSAGE_POLL_INTERVAL = 10000; // 10秒

interface Conversation {
  partnerId: string;
  partnerName: string | null;
  partnerImage: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

/** 出店募集の応募スレッド。DMとは別の仕組みだが、届く場所は一つにまとめる。 */
interface EventThread {
  id: string;
  role: "vendor" | "organizer";
  kind: string;
  status: string;
  eventId: string;
  eventTitle: string;
  eventStartAt: string;
  counterpartName: string;
  counterpartImage: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unread: boolean;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<{ id: string; name: string | null; image: string | null } | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [eventThreads, setEventThreads] = useState<EventThread[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // 最後のメッセージIDを追跡（差分ポーリング用）
  const lastMessageIdRef = useRef<string | null>(null);

  // スクロールが一番下にあるか追跡
  const checkIfAtBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 50;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  // 下にスクロール
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // 会話一覧を取得
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        return data;
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
    return null;
  }, []);

  // 出店募集のやり取り。DMと同じ間隔で取り直す。
  const fetchEventThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/threads");
      if (res.ok) {
        const data = await res.json();
        setEventThreads(data.threads || []);
      }
    } catch {
      // 一覧が出ないだけなので黙って諦める
    }
  }, []);

  useEffect(() => {
    fetchEventThreads();
    const interval = setInterval(fetchEventThreads, CONVERSATION_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchEventThreads]);

  // 初回ロード
  useEffect(() => {
    const init = async () => {
      const data = await fetchConversations();
      if (data && data.length > 0 && !selectedPartnerId) {
        setSelectedPartnerId(data[0].partnerId);
      }
      setIsLoadingConversations(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 会話一覧のポーリング（30秒間隔）
  useEffect(() => {
    const interval = setInterval(fetchConversations, CONVERSATION_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // 選択した会話のメッセージを全件取得
  const fetchAllMessages = useCallback(async (partnerId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/messages/${partnerId}`);
      if (res.ok) {
        const data = await res.json();
        const msgs = data.messages || [];
        setMessages(msgs);
        setPartner(data.partner);
        lastMessageIdRef.current = msgs.length > 0 ? msgs[msgs.length - 1].id : null;
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // 新着メッセージの差分取得（ポーリング用）
  const fetchNewMessages = useCallback(async (partnerId: string) => {
    const afterId = lastMessageIdRef.current;
    if (!afterId) return;

    try {
      const res = await fetch(`/api/messages/${partnerId}?after=${afterId}`);
      if (res.ok) {
        const data = await res.json();
        const newMsgs: Message[] = data.messages || [];
        if (newMsgs.length > 0) {
          setMessages(prev => [...prev, ...newMsgs]);
          lastMessageIdRef.current = newMsgs[newMsgs.length - 1].id;

          // 会話一覧も更新
          const latestMsg = newMsgs[newMsgs.length - 1];
          setConversations(prev =>
            prev.map(conv =>
              conv.partnerId === partnerId
                ? { ...conv, lastMessage: latestMsg.content, lastMessageAt: latestMsg.createdAt, unreadCount: 0 }
                : conv
            )
          );
        }
      }
    } catch (error) {
      console.error("Error polling messages:", error);
    }
  }, []);

  // 会話切り替え時に全件取得
  useEffect(() => {
    if (selectedPartnerId) {
      lastMessageIdRef.current = null;
      fetchAllMessages(selectedPartnerId);
    }
  }, [selectedPartnerId, fetchAllMessages]);

  // メッセージのポーリング（10秒間隔、会話が選択されている時のみ）
  useEffect(() => {
    if (!selectedPartnerId) return;

    const interval = setInterval(() => {
      fetchNewMessages(selectedPartnerId);
    }, MESSAGE_POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [selectedPartnerId, fetchNewMessages]);

  // メッセージ変更時に自動スクロール（一番下にいる場合のみ）
  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedPartnerId || isSending) return;

    const messageContent = newMessage.trim();
    setIsSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedPartnerId,
          content: messageContent,
        }),
      });

      if (res.ok) {
        const sentMessage = await res.json();
        setMessages(prev => [...prev, sentMessage]);
        setNewMessage("");
        lastMessageIdRef.current = sentMessage.id;
        isAtBottomRef.current = true;

        // Update conversation list
        setConversations(prev =>
          prev.map(conv =>
            conv.partnerId === selectedPartnerId
              ? { ...conv, lastMessage: messageContent, lastMessageAt: new Date().toISOString() }
              : conv
          )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return formatTime(dateString);
    if (diffDays === 1) return "昨日";
    if (diffDays < 7) return `${diffDays}日前`;
    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  };

  const selectedConversation = conversations.find(c => c.partnerId === selectedPartnerId);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="h-[calc(100vh-200px)] bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 h-full">
            {/* Conversation List */}
            <div
              className={cn(
                "border-r border-border",
                showChat ? "hidden md:block" : "block"
              )}
            >
              <div className="p-4 border-b border-border">
                <h1 className="text-xl font-bold mb-4">メッセージ</h1>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="会話を検索..."
                    className="pl-10 rounded-full"
                  />
                </div>
              </div>
              <ScrollArea className="h-[calc(100%-120px)]">
                {/* 出店募集のやり取り。応募スレッドは募集ページの下にしか無く、
                    どこに届いているのか分からなかったのでここにも出す。 */}
                {eventThreads.length > 0 && (
                  <div className="border-b border-border">
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/40">
                      <span className="text-xs font-medium text-muted-foreground">
                        出店募集のやり取り
                      </span>
                      {eventThreads.some((t) => t.unread) && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">
                          未読 {eventThreads.filter((t) => t.unread).length}
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-border">
                      {eventThreads.map((thread) => (
                        <Link
                          key={thread.id}
                          href={`/events/applications/${thread.id}`}
                          className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="relative">
                            <Avatar className="h-12 w-12 rounded-xl">
                              <AvatarImage src={thread.counterpartImage || ""} />
                              <AvatarFallback className="rounded-xl bg-muted text-muted-foreground">
                                <CalendarDays className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            {thread.unread && (
                              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={cn(
                                  "truncate text-sm",
                                  thread.unread ? "font-semibold" : "font-medium"
                                )}
                              >
                                {thread.counterpartName}
                              </p>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {formatDate(thread.lastMessageAt)}
                              </span>
                            </div>
                            <p className="truncate text-xs text-muted-foreground mt-0.5">
                              {thread.role === "organizer"
                                ? thread.kind === "scout"
                                  ? "送ったスカウト"
                                  : "受け取った応募"
                                : thread.kind === "scout"
                                  ? "届いたスカウト"
                                  : "応募した募集"}{" "}
                              ・{" "}
                              {thread.eventTitle}
                            </p>
                            {thread.lastMessage && (
                              <p
                                className={cn(
                                  "truncate text-sm mt-1",
                                  thread.unread ? "text-foreground" : "text-muted-foreground"
                                )}
                              >
                                {thread.lastMessage}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 mt-3" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {eventThreads.length > 0 && (
                  <div className="px-4 py-2 bg-muted/40">
                    <span className="text-xs font-medium text-muted-foreground">
                      ダイレクトメッセージ
                    </span>
                  </div>
                )}

                {isLoadingConversations ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">
                      {eventThreads.length > 0
                        ? "ダイレクトメッセージはまだありません"
                        : "メッセージはまだありません"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      スペースオーナーにメッセージを送ってみましょう
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {conversations.map((conversation) => (
                      <button
                        key={conversation.partnerId}
                        className={cn(
                          "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                          selectedPartnerId === conversation.partnerId && "bg-muted"
                        )}
                        onClick={() => {
                          setSelectedPartnerId(conversation.partnerId);
                          setShowChat(true);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={conversation.partnerImage || ""} />
                              <AvatarFallback className="bg-dusty-pink-light text-dusty-pink">
                                {conversation.partnerName?.[0] || "U"}
                              </AvatarFallback>
                            </Avatar>
                            {conversation.unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p
                                className={cn(
                                  "font-medium truncate",
                                  conversation.unreadCount > 0 && "font-semibold"
                                )}
                              >
                                {conversation.partnerName || "ユーザー"}
                              </p>
                              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                {formatDate(conversation.lastMessageAt)}
                              </span>
                            </div>
                            <p
                              className={cn(
                                "text-sm truncate mt-1",
                                conversation.unreadCount > 0
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              )}
                            >
                              {conversation.lastMessage}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div
              className={cn(
                "md:col-span-2 flex flex-col",
                !showChat && "hidden md:flex"
              )}
            >
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden rounded-full"
                    onClick={() => setShowChat(false)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={partner?.image || selectedConversation?.partnerImage || ""} />
                    <AvatarFallback className="bg-dusty-pink-light text-dusty-pink">
                      {partner?.name?.[0] || selectedConversation?.partnerName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{partner?.name || selectedConversation?.partnerName || "ユーザー"}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea
                className="flex-1 p-4"
                ref={scrollRef}
                onScrollCapture={checkIfAtBottom}
              >
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-muted-foreground">メッセージを送信してみましょう</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isMe = msg.senderId === session?.user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex",
                            isMe ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] rounded-2xl px-4 py-2",
                              isMe
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted rounded-bl-sm"
                            )}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <p
                              className={cn(
                                "text-xs mt-1",
                                isMe
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              )}
                            >
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <Input
                    type="text"
                    placeholder="メッセージを入力..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="rounded-full"
                    disabled={isSending}
                  />
                  <Button
                    size="icon"
                    className="rounded-full shrink-0"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSending}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
