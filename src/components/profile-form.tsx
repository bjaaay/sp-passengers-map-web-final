
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { onAuthStateChanged, User, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { ref, onValue, set, get, update } from "firebase/database";
import { auth, database } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, User as UserIcon, Mail, Lock, RefreshCcw, LogOut } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";


interface UserData {
  firstName: string;
  lastName: string;
  username: string;
  office: 'PSO' | 'LTFRB';
  email: string;
}

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  username: z.string().min(1, "Username is required."),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords do not match.",
  path: ["confirmPassword"],
});


export function ProfileForm() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userRef = ref(database, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const dbUser = snapshot.val();
            setUserData(dbUser);
            profileForm.reset({
              firstName: dbUser.firstName,
              lastName: dbUser.lastName,
              username: dbUser.username,
            });
          }
        });
      } else {
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router, profileForm]);
  
  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const onProfileSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    if (!currentUser) return;

    try {
      const userRef = ref(database, `users/${currentUser.uid}`);
      await update(userRef, {
        firstName: values.firstName,
        lastName: values.lastName,
        username: values.username,
      });

      toast({
        title: "Profile Updated",
        description: "Your information has been successfully updated.",
      });
      setIsEditModalOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "An error occurred while updating your profile.",
      });
    }
  };

  const onPasswordSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
    if (!currentUser || !currentUser.email) return;

    const credential = EmailAuthProvider.credential(currentUser.email, values.currentPassword);

    try {
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, values.newPassword);

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
      setIsPasswordModalOpen(false);
      passwordForm.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Password Change Failed",
        description: error.code === 'auth/wrong-password' ? 'The current password you entered is incorrect.' : 'An error occurred. Please try again.',
      });
    }
  };

  if (!currentUser || !userData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative min-h-screen bg-secondary">
        <div className="absolute top-0 left-0 w-full h-48 bg-primary rounded-b-[50%]"></div>
        <div className="relative p-4">
          <div className="flex items-center justify-between text-white mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft />
            </Button>
            <h1 className="text-xl font-semibold">{`${userData.firstName} ${userData.lastName}`}</h1>
            <div className="w-10"></div>
          </div>
          
          <div className="relative flex justify-center mb-6">
            <Avatar className="h-28 w-28 border-4 border-white">
              <AvatarImage src={`https://i.pravatar.cc/150?u=${currentUser.uid}`} />
              <AvatarFallback className="text-4xl">{userData.firstName?.[0]}{userData.lastName?.[0]}</AvatarFallback>
            </Avatar>
          </div>

          <div className="bg-background rounded-lg shadow-sm p-6 space-y-4">
            <div className="flex items-center space-x-4 py-2 border-b">
              <UserIcon className="h-6 w-6 text-muted-foreground" />
              <span>{`${userData.firstName} ${userData.lastName}`}</span>
            </div>
            <div className="flex items-center space-x-4 py-2 border-b">
              <Mail className="h-6 w-6 text-muted-foreground" />
              <span>{currentUser.email}</span>
            </div>
            <button onClick={() => setIsPasswordModalOpen(true)} className="w-full flex items-center space-x-4 py-2 border-b text-left">
              <Lock className="h-6 w-6 text-muted-foreground" />
              <span>Password</span>
              <RefreshCcw className="h-5 w-5 text-muted-foreground ml-auto" />
            </button>
            <button onClick={handleLogout} className="w-full flex items-center space-x-4 py-2 text-left">
              <LogOut className="h-6 w-6 text-muted-foreground" />
              <span>Logout</span>
            </button>
          </div>

          <div className="mt-8">
            <Button size="lg" className="w-full" onClick={() => setIsEditModalOpen(true)}>
              Edit Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                  {profileForm.formState.isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
       {/* Change Password Dialog */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                <Button type="button" variant="ghost" onClick={() => setIsPasswordModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                  {passwordForm.formState.isSubmitting ? "Updating..." : "Update Password"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
