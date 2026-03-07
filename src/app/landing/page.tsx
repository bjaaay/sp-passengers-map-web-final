"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { signOut, User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PassengersMapLogo } from "@/components/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserCircle, LogOut, ArrowRight, BarChart3 } from "lucide-react";
import Link from "next/link";

interface UserData {
  firstName: string;
  lastName: string;
  office: 'PSO' | 'Super Admin';
  profilePictureUrl?: string;
  municipality?: string;
}

export default function LandingPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setCurrentUser(user);
        const userRef = ref(database, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserData(snapshot.val());
          }
          setIsLoading(false);
        });
      } else {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleProceedToDashboard = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!currentUser || !userData) {
    return <div className="flex h-screen items-center justify-center">Redirecting...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="text-green-500">Passengers</span>
                <span className="text-blue-500"> Map</span>
              </h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userData.profilePictureUrl} alt="@user" />
                    <AvatarFallback>{userData.firstName?.[0]}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{`${userData.firstName} ${userData.lastName} (${userData.office})`}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userData.office === 'PSO' ? 'Public Safety Office' : 'Super Administrator'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-2xl shadow-xl">
          <div className="p-8 sm:p-12">
            <div className="flex flex-col items-center text-center space-y-8">
              {/* Logo */}
              <div className="h-32 w-32">
                <PassengersMapLogo className="h-full w-full" />
              </div>

              {/* Welcome Message */}
              <div className="space-y-3">
                <h1 className="text-4xl font-bold">Welcome Back!</h1>
                <p className="text-lg text-muted-foreground">
                  Hello, <span className="font-semibold text-foreground">{userData.firstName} {userData.lastName}</span>
                </p>
                <p className="text-base text-muted-foreground max-w-md mx-auto">
                  {userData.municipality ? (
                    <>You are assigned to <span className="font-semibold text-foreground">{userData.municipality}</span> municipality</>
                  ) : (
                    <>You are ready to manage complaints and vehicles</>
                  )}
                </p>
              </div>

              {/* Quick Stats or Info Cards */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                <Link href="/dashboard">
                  <div className="bg-blue-50 rounded-lg p-4 hover:bg-blue-100 transition cursor-pointer h-full">
                    <p className="text-2xl font-bold text-blue-600">📋</p>
                    <p className="text-sm font-medium mt-2">Manage</p>
                    <p className="text-xs text-muted-foreground">Complaints</p>
                  </div>
                </Link>
                <Link href="/violators">
                  <div className="bg-green-50 rounded-lg p-4 hover:bg-green-100 transition cursor-pointer h-full">
                    <p className="text-2xl font-bold text-green-600">⚠️</p>
                    <p className="text-sm font-medium mt-2">Monitor</p>
                    <p className="text-xs text-muted-foreground">Violators</p>
                  </div>
                </Link>
                <Link href="/analytics">
                  <div className="bg-purple-50 rounded-lg p-4 hover:bg-purple-100 transition cursor-pointer h-full">
                    <p className="text-2xl font-bold text-purple-600">📊</p>
                    <p className="text-sm font-medium mt-2">View</p>
                    <p className="text-xs text-muted-foreground">Analytics</p>
                  </div>
                </Link>
              </div>

              {/* Main CTA Button */}
              <Button
                onClick={handleProceedToDashboard}
                size="lg"
                className="mt-6 w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {/* Secondary Actions */}
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  asChild
                >
                  <Link href="/analytics">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analytics
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  asChild
                >
                  <Link href="/profile">My Profile</Link>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
