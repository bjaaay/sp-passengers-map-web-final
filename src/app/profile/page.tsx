
import { ProfileForm } from "@/components/profile-form";
import { AuthGuard } from "@/components/auth-guard";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-background text-foreground">
        <ProfileForm />
      </main>
    </AuthGuard>
  );
}
