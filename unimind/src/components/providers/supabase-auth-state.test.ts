import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { subscribeToAuthState } from "./supabase-auth-state";

const alice = { id: "alice" } as User;
const bob = { id: "bob" } as User;

function setup() {
  let emit!: (event: AuthChangeEvent, session: Session | null) => void;
  let resolve!: (value: { data: { user: User | null }; error: null }) => void;
  let reject!: (error: Error) => void;
  const pending = new Promise<{ data: { user: User | null }; error: null }>(
    (resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    },
  );
  const unsubscribe = jest.fn();
  const getUser = jest.fn(() => pending);
  const onAuthStateChange = jest.fn((callback: typeof emit) => {
    emit = callback;
    return { data: { subscription: { unsubscribe } } };
  });
  const onUser = jest.fn();
  const onReady = jest.fn();
  const refresh = jest.fn();
  const cleanup = subscribeToAuthState(
    { getUser, onAuthStateChange } as unknown as Parameters<
      typeof subscribeToAuthState
    >[0],
    onUser,
    onReady,
    refresh,
  );
  return {
    emit: (event: AuthChangeEvent, user: User | null) =>
      emit(event, user ? ({ user } as Session) : null),
    resolve: (user: User | null) => resolve({ data: { user }, error: null }),
    reject,
    onUser,
    onReady,
    refresh,
    cleanup,
    unsubscribe,
    getUser,
    onAuthStateChange,
  };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("auth subscription lifecycle", () => {
  it("subscribes before reading the user and never refreshes INITIAL_SESSION", async () => {
    const state = setup();
    expect(state.onAuthStateChange.mock.invocationCallOrder[0]).toBeLessThan(
      state.getUser.mock.invocationCallOrder[0]!,
    );
    state.emit("INITIAL_SESSION", alice);
    state.resolve(alice);
    await flush();
    expect(state.onUser).toHaveBeenLastCalledWith(alice);
    expect(state.onReady).toHaveBeenCalled();
    expect(state.refresh).not.toHaveBeenCalled();
  });

  it.each(["SIGNED_IN", "SIGNED_OUT"] as const)(
    "does not let a stale getUser or initial session overwrite %s",
    async (event) => {
      const state = setup();
      state.emit("INITIAL_SESSION", alice);
      const nextUser = event === "SIGNED_IN" ? bob : null;
      state.emit(event, nextUser);
      state.emit("INITIAL_SESSION", alice);
      state.resolve(alice);
      await flush();
      expect(state.onUser).toHaveBeenLastCalledWith(nextUser);
      expect(state.onUser).toHaveBeenCalledTimes(2);
      expect(state.refresh).toHaveBeenCalledTimes(1);
    },
  );

  it("does not let a late initial session replace the verified user", async () => {
    const state = setup();
    state.resolve(bob);
    await flush();
    state.emit("INITIAL_SESSION", alice);
    expect(state.onUser).toHaveBeenCalledTimes(1);
    expect(state.onUser).toHaveBeenLastCalledWith(bob);
    expect(state.refresh).not.toHaveBeenCalled();
  });

  it("avoids refresh loops for repeated sign-in and token refresh events", () => {
    const state = setup();
    state.emit("INITIAL_SESSION", alice);
    state.emit("SIGNED_IN", alice);
    state.emit("TOKEN_REFRESHED", alice);
    state.emit("SIGNED_IN", alice);
    expect(state.refresh).not.toHaveBeenCalled();
    state.emit("USER_UPDATED", alice);
    expect(state.refresh).toHaveBeenCalledTimes(1);
    state.emit("SIGNED_OUT", null);
    state.emit("SIGNED_OUT", null);
    expect(state.refresh).toHaveBeenCalledTimes(2);
  });

  it("ignores stale rejected lookups after a real auth event", async () => {
    const state = setup();
    state.emit("SIGNED_IN", bob);
    state.reject(new Error("offline"));
    await flush();
    expect(state.onUser).toHaveBeenCalledTimes(1);
    expect(state.onUser).toHaveBeenLastCalledWith(bob);
  });

  it("ends loading without discarding the initial session on network rejection", async () => {
    const state = setup();
    state.emit("INITIAL_SESSION", alice);
    state.reject(new Error("offline"));
    await flush();
    expect(state.onUser).toHaveBeenCalledTimes(1);
    expect(state.onUser).toHaveBeenLastCalledWith(alice);
    expect(state.onReady).toHaveBeenCalled();
  });

  it("ignores resolved lookups and callbacks after cleanup", async () => {
    const state = setup();
    state.cleanup();
    state.emit("SIGNED_IN", bob);
    state.resolve(alice);
    await flush();
    expect(state.unsubscribe).toHaveBeenCalledTimes(1);
    expect(state.onUser).not.toHaveBeenCalled();
    expect(state.onReady).not.toHaveBeenCalled();
    expect(state.refresh).not.toHaveBeenCalled();
  });
});
