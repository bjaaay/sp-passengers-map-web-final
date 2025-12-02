
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { onAuthStateChanged, User, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { ref, onValue, update } from "firebase/database";
import { auth, database } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, User as UserIcon, Mail, Lock, LogOut, Camera, KeyRound, ShieldCheck } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "./ui/separator";

interface UserData {
  firstName: string;
  lastName: string;
  username: string;
  office: 'PSO' | 'LTFRB';
  email: string;
  profilePictureUrl?: string;
}

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  username: z.string().min(1, "Username is required."),
  profilePicture: z.any().optional(),
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            setImagePreview(dbUser.profilePictureUrl || null);
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const onProfileSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    if (!currentUser) return;

    try {
      const userRef = ref(database, `users/${currentUser.uid}`);
      const updates: Partial<UserData> = {
        firstName: values.firstName,
        lastName: values.lastName,
        username: values.username,
      };

      if (values.profilePicture && values.profilePicture.length > 0) {
        const file = values.profilePicture[0];
        const base64 = await fileToBase64(file);
        updates.profilePictureUrl = base64;
      }

      await update(userRef, updates);

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
      <div className="min-h-screen bg-secondary">
        <div className="container mx-auto py-8">
            <div className="flex items-center mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-4">
                <ArrowLeft />
                </Button>
                <h1 className="text-3xl font-bold">Profile Settings</h1>
            </div>
          
            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <Card>
                        <CardContent className="p-6 text-center">
                            <Avatar className="h-28 w-28 border-4 border-white mx-auto mb-4">
                                <AvatarImage src={userData.profilePictureUrl} />
                                <AvatarFallback className="text-4xl">{userData.firstName?.[0]}{userData.lastName?.[0]}</AvatarFallback>
                            </Avatar>
                            <h2 className="text-2xl font-bold">{`${userData.firstName} ${userData.lastName}`}</h2>
                            <p className="text-muted-foreground">@{userData.username}</p>
                            <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                             <Button className="mt-4 w-full" onClick={() => {
                                profileForm.reset({
                                    firstName: userData.firstName,
                                    lastName: userData.lastName,
                                    username: userData.username,
                                });
                                setImagePreview(userData.profilePictureUrl || null);
                                setIsEditModalOpen(true);
                                }}>
                                Edit Profile
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-2 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Security</CardTitle>
                            <CardDescription>Manage your password and account security.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <div className="flex items-center">
                                <KeyRound className="h-5 w-5 mr-3 text-muted-foreground"/>
                                <span>Password</span>
                                <Button variant="outline" className="ml-auto" onClick={() => setIsPasswordModalOpen(true)}>Change Password</Button>
                           </div>
                           <Separator className="my-4"/>
                           <div className="flex items-center">
                                <ShieldCheck className="h-5 w-5 mr-3 text-muted-foreground"/>
                                <span>Account Status</span>
                               <span className="ml-auto text-sm font-medium text-green-600">Verified</span>
                           </div>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle>Account Actions</CardTitle>
                             <CardDescription>Log out from your account.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="destructive" className="w-full" onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </Button>
                        </CardContent>
                    </Card>
                </div>
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
              <div className="flex justify-center">
                <div className="relative">
                  <Avatar className="h-24 w-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <AvatarImage src={imagePreview || undefined} />
                    <AvatarFallback className="text-3xl">{userData.firstName?.[0]}{userData.lastName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1.5 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Camera className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <FormField
                    control={profileForm.control}
                    name="profilePicture"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            type="file" 
                            accept="image/*"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={(e) => {
                              field.onChange(e.target.files);
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setImagePreview(reader.result as string);
                                }
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
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
