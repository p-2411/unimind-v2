'use client';
import { Button } from "~/components/ui/button";
import { signIn } from "next-auth/react";

export default function SignIn() {  
    return (
        <div className="flex h-screen items-center justify-center">
            <h1 className="text-2xl font-bold">Please sign in to continue</h1>
            <Button onClick={() => signIn("google")}>Sign in with Google</Button>
        </div>
    );
}