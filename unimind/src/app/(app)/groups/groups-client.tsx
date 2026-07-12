"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Copy, LogOut, Plus, Users } from "lucide-react";

export function GroupsClient() {
  const router = useRouter();
  const groupsQuery = api.group.myGroups.useQuery();
  const createGroup = api.group.create.useMutation({
    onSuccess: (g) => {
      setCreateName("");
      void groupsQuery.refetch();
      router.push(`/groups/${g.id}`);
    },
  });
  const joinGroup = api.group.join.useMutation({
    onSuccess: (g) => {
      setJoinCode("");
      void groupsQuery.refetch();
      router.push(`/groups/${g.id}`);
    },
  });
  const leaveGroup = api.group.leave.useMutation({
    onSuccess: () => void groupsQuery.refetch(),
  });

  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    createGroup.mutate({ name: createName.trim() });
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoinError(null);
    if (!joinCode.trim()) return;
    try {
      await joinGroup.mutateAsync({ inviteCode: joinCode.trim() });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid invite code";
      setJoinError(msg);
    }
  }

  function copyCode(code: string) {
    void navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1800);
  }

  const groups = groupsQuery.data ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: group list */}
      <div>
        <div className="flex items-end gap-4 border-b border-[color:var(--color-rule)] pb-2">
          <h2 className="font-mono text-[16px] font-semibold tracking-tight text-[color:var(--color-fg)]">
            Your Groups
          </h2>
          <span className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-mute)]">
            {groups.length} total
          </span>
        </div>

        {groupsQuery.isLoading ? (
          <div className="mt-4 space-y-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]"
              />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)]/50 p-8 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-[color:var(--color-fg-mute)]" strokeWidth={1.5} />
            <p className="font-sans text-[13px] text-[color:var(--color-fg-mute)]">
              No groups yet — create one or join with an invite code.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {groups.map((g) => {
              const role = g.members[0]?.role ?? "member";
              return (
                <li
                  key={g.id}
                  className="overflow-hidden rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]"
                >
                  <button
                    onClick={() => router.push(`/groups/${g.id}`)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-[color:var(--color-panel-hi)]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-rule-hi)] bg-[color:var(--color-void)] font-mono text-[16px] text-[color:var(--color-phosphor)]">
                      {g.name[0]?.toUpperCase() ?? "G"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-sans text-[14px] font-medium text-[color:var(--color-fg)]">
                          {g.name}
                        </span>
                        {role === "owner" && (
                          <span className="shrink-0 rounded-full border border-[color:var(--color-amber)]/40 bg-[color:var(--color-amber)]/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-amber)]">
                            Owner
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-[color:var(--color-fg-mute)]">
                        {g._count.members} member{g._count.members !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyCode(g.inviteCode);
                        }}
                        title="Copy invite code"
                        className="flex items-center gap-1.5 rounded-lg border border-[color:var(--color-rule-hi)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-mute)] transition-colors hover:border-[color:var(--color-phosphor)]/40 hover:text-[color:var(--color-phosphor)]"
                      >
                        <Copy className="h-3 w-3" />
                        {copied === g.inviteCode ? "Copied!" : g.inviteCode}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Leave "${g.name}"?`)) {
                            leaveGroup.mutate({ groupId: g.id });
                          }
                        }}
                        title="Leave group"
                        className="rounded-lg border border-transparent p-1 text-[color:var(--color-fg-mute)] transition-colors hover:border-[color:var(--color-red)]/30 hover:text-[color:var(--color-red)]"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Right: create + join */}
      <div className="space-y-6">
        {/* Create */}
        <div>
          <div className="flex items-end gap-4 border-b border-[color:var(--color-rule)] pb-2">
            <h2 className="font-mono text-[16px] font-semibold tracking-tight text-[color:var(--color-fg)]">
              Create a Group
            </h2>
          </div>
          <form onSubmit={handleCreate} className="mt-4 space-y-3">
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. COMP1521 Squad"
              maxLength={50}
              className="w-full rounded-lg border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] px-3 py-2.5 font-sans text-[13px] text-[color:var(--color-fg)] outline-none transition-colors placeholder:text-[color:var(--color-fg-mute)]/60 focus:border-[color:var(--color-phosphor)]"
            />
            <button
              type="submit"
              disabled={!createName.trim() || createGroup.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-void)] transition-all hover:bg-[color:var(--color-phosphor)]/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:border-[color:var(--color-rule)] disabled:bg-transparent disabled:text-[color:var(--color-fg-mute)]"
            >
              <Plus className="h-3.5 w-3.5" />
              {createGroup.isPending ? "Creating…" : "Create Group"}
            </button>
          </form>
        </div>

        {/* Join */}
        <div>
          <div className="flex items-end gap-4 border-b border-[color:var(--color-rule)] pb-2">
            <h2 className="font-mono text-[16px] font-semibold tracking-tight text-[color:var(--color-fg)]">
              Join a Group
            </h2>
          </div>
          <form onSubmit={handleJoin} className="mt-4 space-y-3">
            <input
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(null); }}
              placeholder="Invite code — e.g. AB3XMQK"
              maxLength={10}
              className="w-full rounded-lg border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] px-3 py-2.5 font-mono text-[13px] uppercase tracking-[0.12em] text-[color:var(--color-fg)] outline-none transition-colors placeholder:text-[color:var(--color-fg-mute)]/60 placeholder:tracking-normal placeholder:font-sans focus:border-[color:var(--color-phosphor)]"
            />
            {joinError && (
              <p className="font-mono text-[11px] text-[color:var(--color-red)]">{joinError}</p>
            )}
            <button
              type="submit"
              disabled={!joinCode.trim() || joinGroup.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--color-cyan)] bg-[color:var(--color-cyan)]/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-cyan)] transition-all hover:bg-[color:var(--color-cyan)]/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:border-[color:var(--color-rule)] disabled:bg-transparent disabled:text-[color:var(--color-fg-mute)]"
            >
              {joinGroup.isPending ? "Joining…" : "Join with Code"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
