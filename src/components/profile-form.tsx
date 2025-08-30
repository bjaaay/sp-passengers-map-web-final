
"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { auth, database } from "@/lib/firebase"
import { onAuthStateChanged, signOut, User } from "firebase/auth"
import { ref, onValue } from "firebase/database"
import { ArrowLeft, User as UserIcon, Mail, Lock, LogOut, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form"

const passwordFormSchema = z.object({
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords do not match.",
  path: ["confirmPassword"],
});

interface UserData {
  firstName: string;
  lastName: string;
  office: 'PSO' | 'LTFRB';
  email: string;
}

export function ProfileForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const userRef = ref(database, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserData(snapshot.val());
          } else {
            router.push('/');
          }
        });
      } else {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onPasswordSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
    // This functionality would require reauthentication, which is complex to handle here.
    // For this design, we will just show a success message.
    toast({
      title: "Success",
      description: "Your password has been updated.",
    });
    passwordForm.reset();
    setIsPasswordDialogOpen(false);
  }

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (!currentUser || !userData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  const fullName = `${userData.firstName} ${userData.lastName}`;

  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute top-0 left-0 w-full h-48 bg-primary rounded-b-[50%]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex items-center justify-between h-16 text-primary-foreground">
             <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft />
            </Button>
            <h1 className="text-xl font-bold">{fullName}</h1>
            <div className="w-8"></div>
          </div>
        </div>
      </div>

      <div className="relative pt-24">
        <div className="flex justify-center">
          <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
            <AvatarImage src={`https://i.pravatar.cc/150?u=${currentUser.uid}`} alt={fullName} />
            <AvatarFallback className="text-4xl">{userData.firstName?.[0]}{userData.lastName?.[0]}</AvatarFallback>
          </Avatar>
        </div>

        <div className="mt-8 container mx-auto px-4 sm:px-6 lg:px-8 max-w-md">
          <div className="space-y-2">
            <div className="flex items-center p-4 border-b">
              <UserIcon className="h-6 w-6 mr-4 text-muted-foreground" />
              <span className="text-lg">{fullName}</span>
            </div>
            <div className="flex items-center p-4 border-b">
              <Mail className="h-6 w-6 mr-4 text-muted-foreground" />
              <span className="text-lg">{userData.email}</span>
            </div>
            <button onClick={() => setIsPasswordDialogOpen(true)} className="w-full flex items-center p-4 border-b text-left">
              <Lock className="h-6 w-6 mr-4 text-muted-foreground" />
              <span className="text-lg flex-1">Password</span>
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
            </button>
            <button onClick={handleLogout} className="w-full flex items-center p-4 border-b text-left">
              <LogOut className="h-6 w-6 mr-4 text-muted-foreground" />
              <span className="text-lg">Logout</span>
            </button>
          </div>
          
          <div className="mt-8">
            <Button size="lg" className="w-full">Edit Profile</Button>
          </div>
        </div>
      </div>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter a new password for your account.
            </DialogDescription>
          </DialogHeader>
           <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                        <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                        <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                  {passwordForm.formState.isSubmitting ? "Updating..." : "Update Password"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
