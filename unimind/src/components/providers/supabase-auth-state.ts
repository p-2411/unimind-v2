import type { SupabaseClient, User } from "@supabase/supabase-js";

export function subscribeToAuthState(
  auth: Pick<SupabaseClient["auth"], "getUser" | "onAuthStateChange">,
  onUser: (user: User | null) => void,
  onReady: () => void,
  refresh: () => void,
) {
  let cancelled = false;
  let receivedAuthEvent = false;
  let bootstrapSettled = false;
  let currentUserId: string | null = null;

  function updateUser(user: User | null) {
    currentUserId = user?.id ?? null;
    onUser(user);
    onReady();
  }

  const { data: listener } = auth.onAuthStateChange((event, session) => {
    if (cancelled) return;

    // Bootstrap snapshots must never replace a newer event or verified user.
    if (event === "INITIAL_SESSION") {
      if (!receivedAuthEvent && !bootstrapSettled) {
        updateUser(session?.user ?? null);
      }
      return;
    }

    receivedAuthEvent = true;
    const nextUser = session?.user ?? null;
    const identityChanged = currentUserId !== (nextUser?.id ?? null);
    updateUser(nextUser);

    if (identityChanged || event === "USER_UPDATED") refresh();
  });

  void auth
    .getUser()
    .then(({ data, error }) => {
      bootstrapSettled = true;
      if (cancelled || receivedAuthEvent) return;
      updateUser(error ? null : data.user);
    })
    .catch(() => {
      bootstrapSettled = true;
      if (cancelled || receivedAuthEvent) return;
      // A network failure is not evidence that an initial session signed out.
      onReady();
    });

  return () => {
    cancelled = true;
    listener.subscription.unsubscribe();
  };
}
