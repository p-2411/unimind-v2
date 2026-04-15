import "~/styles/globals.css";

import { type Metadata } from "next";
import { JetBrains_Mono, Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { SupabaseProvider } from "~/components/providers/supabase-provider";

export const metadata: Metadata = {
  title: "Unimind — CS Practice Console",
  description: "A practice console for computer science students.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${jetbrains.variable} dark`}>
      <body className="font-mono antialiased">
        <SupabaseProvider>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
