"use client";

import { type User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "~/lib/supabase/browser";
import { subscribeToAuthState } from "./supabase-auth-state";

type SupabaseContextValue = {
  supabase: ReturnType<typeof createSupabaseBrowserClient>;
  user: User | null;
  isLoading: boolean;
};

const SupabaseContext = createContext<SupabaseContextValue | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(
    () =>
      subscribeToAuthState(
        supabase.auth,
        setUser,
        () => setIsLoading(false),
        () => router.refresh(),
      ),
    [supabase, router],
  );

  return (
    <SupabaseContext.Provider value={{ supabase, user, isLoading }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error("useSupabase must be used inside SupabaseProvider");
  return ctx;
}

export function useUser() {
  const { user, isLoading } = useSupabase();
  return { user, isLoading };
}
