
"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ComplaintDashboard } from "@/components/complaint-dashboard"
import { RegisterVehicleForm } from "@/components/register-vehicle-form"
import { PassengersMapLogo } from './icons';
import { VehicleList } from "./vehicle-list";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { UserCircle, LogOut } from "lucide-react";
import Link from "next/link";
import { signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function LtfrbDashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);
  
  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  return (
    <div className="flex flex-col h-full bg-background">
       <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
         <div className="container mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <PassengersMapLogo className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">LTFRB Dashboard</h1>
            </div>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${currentUser?.uid}`} alt="@user" />
                    <AvatarFallback>L</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
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
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="complaints" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-xl mx-auto">
            <TabsTrigger value="complaints">Complaints</TabsTrigger>
            <TabsTrigger value="register-vehicle">Register Vehicle</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          </TabsList>
          <TabsContent value="complaints" className="mt-6">
            <ComplaintDashboard />
          </TabsContent>
          <TabsContent value="register-vehicle" className="mt-6">
            <div className="max-w-2xl mx-auto">
              <RegisterVehicleForm />
            </div>
          </TabsContent>
           <TabsContent value="vehicles" className="mt-6">
            <VehicleList />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
