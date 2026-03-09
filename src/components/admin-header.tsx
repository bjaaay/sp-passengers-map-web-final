"use client"

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { UserCircle, LogOut, ChevronDown } from "lucide-react";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

interface AdminHeaderProps {
  userData: {
    firstName: string;
    lastName: string;
    office: 'PSO' | 'LTFRB' | 'Super Admin';
    profilePictureUrl?: string;
  };
}

export function AdminHeader({ userData }: AdminHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/landing');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto p-2 flex items-center gap-3 hover:bg-accent">
            <Avatar className="h-9 w-9">
              <AvatarImage src={userData.profilePictureUrl} alt="@user" />
              <AvatarFallback className="text-sm font-medium">{userData.firstName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <p className="text-sm font-medium">{userData.firstName} {userData.lastName}</p>
              <p className="text-xs text-muted-foreground">{userData.office === 'PSO' ? 'Public Safety Office' : 'Super Administrator'}</p>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" forceMount>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <UserCircle className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
