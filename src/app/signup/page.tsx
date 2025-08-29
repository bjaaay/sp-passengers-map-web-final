import { SignUpForm } from "@/components/signup-form";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-4xl">
        <SignUpForm />
      </div>
    </main>
  );
}
