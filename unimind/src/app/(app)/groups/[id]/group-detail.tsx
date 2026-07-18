"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Flame, Send, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { AnimatedBar } from "~/components/animated-bar";

function masteryColor(score: number) {
  if (score >= 80) return "var(--color-phosphor)";
  if (score >= 60) return "var(--color-cyan)";
  if (score >= 40) return "var(--color-amber)";
  return "var(--color-red)";
}

function Avatar({ name, image, size = 8 }: { name: string; image: string | null; size?: number }) {
  const cls = `h-${size} w-${size} rounded-full border border-[color:var(--color-rule-hi)] object-cover`;
  if (image) return <Image src={image} alt={name} width={32} height={32} className={cls} unoptimized />;
  return (
    <div className={`h-${size} w-${size} flex shrink-0 items-center justify-center rounded-full border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] font-mono text-[13px] text-[color:var(--color-phosphor)]`}>
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export function GroupDetail({ groupId, currentUserId }: { groupId: string; currentUserId: string }) {
  const router = useRouter();

  const groupQuery = api.group.get.useQuery({ groupId });
  const leaderboard = api.group.leaderboard.useQuery({ groupId });
  const messagesQuery = api.group.messages.useQuery(
    { groupId },
    { refetchInterval: 3500 },
  );
  const sendMessage = api.group.sendMessage.useMutation({
    onSuccess: () => void messagesQuery.refetch(),
  });

  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);

  const messages = messagesQuery.data ?? [];

  useEffect(() => {
    if (messages.length !== prevMsgCount.current) {
      prevMsgCount.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text || sendMessage.isPending) return;
    setContent("");
    sendMessage.mutate({ groupId, content: text });
  }

  const group = groupQuery.data;
  const board = leaderboard.data ?? [];

  return (
    <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
        <div className="flex h-12 items-center gap-3 px-4">
          <button
            onClick={() => router.push("/groups")}
            className="flex items-center gap-1.5 font-mono text-[11px] text-[color:var(--color-fg-mute)] transition-colors hover:text-[color:var(--color-fg)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Groups
          </button>
          <span className="text-[color:var(--color-rule-hi)]">/</span>
          <span className="font-mono text-[11px] text-[color:var(--color-fg)]">
            {group?.name ?? "…"}
          </span>
          {group && (
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-mute)]">
              {group._count.members} members
            </span>
          )}
        </div>
        <div className="term-scan h-px w-full origin-left bg-gradient-to-r from-[color:var(--color-cyan)] via-[color:var(--color-phosphor)] to-transparent" />
      </header>

      <div className="grid h-[calc(100svh-49px)] grid-cols-1 gap-0 lg:grid-cols-[380px_1fr]">
        {/* Left: leaderboard */}
        <aside className="hidden overflow-y-auto border-r border-[color:var(--color-rule)] lg:block">
          <div className="px-5 py-5">
            <div className="flex items-center gap-2 border-b border-[color:var(--color-rule)] pb-2">
              <Trophy className="h-3.5 w-3.5 text-[color:var(--color-amber)]" strokeWidth={2} />
              <h2 className="font-mono text-[13px] font-semibold tracking-tight text-[color:var(--color-fg)]">
                Leaderboard
              </h2>
            </div>

            {leaderboard.isLoading ? (
              <div className="mt-4 space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-[color:var(--color-rule-hi)]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-28 animate-pulse rounded bg-[color:var(--color-rule-hi)]" />
                      <div className="h-2 w-full animate-pulse rounded bg-[color:var(--color-rule-hi)]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ol className="mt-4 space-y-3">
                {board.map((member, i) => {
                  const isMe = member.userId === currentUserId;
                  const mColor = masteryColor(member.mastery);
                  return (
                    <li
                      key={member.userId}
                      className={`flex items-start gap-3 rounded-lg p-2.5 ${isMe ? "bg-[color:var(--color-phosphor)]/8 ring-1 ring-[color:var(--color-phosphor)]/20" : "hover:bg-[color:var(--color-panel)]"}`}
                    >
                      <span
                        className="mt-0.5 w-5 shrink-0 text-center font-mono text-[13px] font-bold tabular-nums"
                        style={{
                          color: i === 0 ? "var(--color-amber)" : i === 1 ? "var(--color-fg-soft)" : i === 2 ? "#cd7f32" : "var(--color-fg-mute)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <Avatar name={member.name} image={member.image} size={8} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-sans text-[13px] font-medium text-[color:var(--color-fg)]">
                            {member.name}
                          </span>
                          {isMe && (
                            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-phosphor)]">you</span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2.5 font-mono text-[10px] text-[color:var(--color-fg-mute)]">
                          <span className="text-[color:var(--color-phosphor)]">L{member.level}</span>
                          <span>{member.xp} XP</span>
                          {member.streak > 0 && (
                            <span className="flex items-center gap-0.5 text-[color:var(--color-amber)]">
                              <Flame className="h-2.5 w-2.5" fill="currentColor" />
                              {member.streak}d
                            </span>
                          )}
                        </div>
                        {member.mastery > 0 && (
                          <div className="mt-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[9px] text-[color:var(--color-fg-mute)]">Mastery</span>
                              <span className="font-mono text-[9px]" style={{ color: mColor }}>{member.mastery}%</span>
                            </div>
                            <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-[color:var(--color-rule-hi)]">
                              <AnimatedBar pct={member.mastery} color={mColor} delay={i * 60} rounded />
                            </div>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </aside>

        {/* Right: chat */}
        <div className="flex flex-col overflow-hidden">
          {/* Mobile leaderboard toggle */}
          <div className="lg:hidden">
            <details className="border-b border-[color:var(--color-rule)]">
              <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-mute)] select-none hover:text-[color:var(--color-fg)]">
                <Trophy className="h-3.5 w-3.5 text-[color:var(--color-amber)]" strokeWidth={2} />
                Leaderboard
              </summary>
              <div className="bg-[color:var(--color-panel)] px-4 pb-4 pt-2">
                {board.map((member, i) => {
                  const isMe = member.userId === currentUserId;
                  return (
                    <div key={member.userId} className="flex items-center gap-3 py-2">
                      <span className="w-4 shrink-0 text-center font-mono text-[11px] font-bold tabular-nums text-[color:var(--color-fg-mute)]">
                        {i + 1}
                      </span>
                      <Avatar name={member.name} image={member.image} size={6} />
                      <span className="flex-1 truncate font-sans text-[12px] text-[color:var(--color-fg)]">
                        {member.name}{isMe && <span className="ml-1 text-[color:var(--color-phosphor)]">*</span>}
                      </span>
                      <span className="font-mono text-[11px] text-[color:var(--color-phosphor)]">L{member.level}</span>
                      <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">{member.xp} XP</span>
                    </div>
                  );
                })}
              </div>
            </details>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {messagesQuery.isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="h-6 w-6 animate-pulse rounded-full bg-[color:var(--color-rule-hi)]" />
                    <div className="h-8 w-48 animate-pulse rounded-xl bg-[color:var(--color-panel)]" />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="font-sans text-[13px] text-[color:var(--color-fg-mute)]">
                  No messages yet — say hi!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, i) => {
                  const isMe = msg.userId === currentUserId;
                  const prevMsg = messages[i - 1];
                  const showName = !prevMsg || prevMsg.userId !== msg.userId;
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                      <div className={`shrink-0 ${showName ? "visible" : "invisible"}`}>
                        <Avatar name={msg.user.name ?? "?"} image={msg.user.image} size={6} />
                      </div>
                      <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                        {showName && !isMe && (
                          <span className="mb-1 ml-1 font-mono text-[10px] text-[color:var(--color-fg-mute)]">
                            {msg.user.name ?? "Anonymous"}
                          </span>
                        )}
                        <div
                          className={`rounded-2xl px-3.5 py-2 font-sans text-[13px] leading-snug ${
                            isMe
                              ? "rounded-br-sm bg-[color:var(--color-phosphor)] text-[color:var(--color-void)]"
                              : "rounded-bl-sm bg-[color:var(--color-panel)] text-[color:var(--color-fg)]"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className={`mt-0.5 font-mono text-[9px] text-[color:var(--color-fg-mute)] ${isMe ? "mr-1" : "ml-1"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-[color:var(--color-rule)] bg-[color:var(--color-void)]/80 px-4 py-3">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Send a message…"
                maxLength={500}
                className="flex-1 rounded-full border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] px-4 py-2 font-sans text-[13px] text-[color:var(--color-fg)] outline-none transition-colors placeholder:text-[color:var(--color-fg-mute)]/60 focus:border-[color:var(--color-phosphor)]"
              />
              <button
                type="submit"
                disabled={!content.trim() || sendMessage.isPending}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)] transition-all hover:bg-[color:var(--color-phosphor)]/90 active:scale-[0.97] disabled:border-[color:var(--color-rule)] disabled:bg-transparent disabled:text-[color:var(--color-fg-mute)]"
              >
                <Send className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
