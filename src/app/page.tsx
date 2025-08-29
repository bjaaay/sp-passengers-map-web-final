import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/login-form";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-4xl">
        <LoginForm />
      </div>
    </main>
  );
}
