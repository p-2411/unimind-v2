export function keepPreviewQuestion<T extends { id: string }>(
  current: T | null,
  incoming: T | null,
  hasAttempt: boolean,
  hasSelection: boolean,
): T | null {
  return hasAttempt || hasSelection ? current : incoming;
}

export function getOrCreateStablePayload<TDraft, TPayload>(
  current: TPayload | undefined,
  draft: TDraft,
  create: (draft: TDraft) => TPayload,
): TPayload {
  return current ?? create(draft);
}
