"use client"

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PassengersMapLogo } from "@/components/icons";
import { Eye, EyeOff } from "lucide-react";

export function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <Card className="overflow-hidden shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="bg-card p-8 flex flex-col items-center justify-center order-last md:order-first">
          <div className="flex flex-col items-center text-center">
            <div className="relative h-20 w-20 mb-4">
              <PassengersMapLogo className="h-full w-full text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-accent">Passengers</h1>
            <p className="text-sm tracking-[0.4em] text-primary font-medium">MAP</p>
          </div>
        </div>
        <div className="p-8 bg-card">
          <div className="flex flex-col justify-center h-full">
            <div className="w-full max-w-sm mx-auto">
              <h2 className="text-2xl font-semibold text-center text-primary mb-6">Sign Up</h2>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="office">Select Office</Label>
                  <Select>
                    <SelectTrigger id="office">
                      <SelectValue placeholder="Select Office" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">Main Office</SelectItem>
                      <SelectItem value="branch-a">Branch A</SelectItem>
                      <SelectItem value="branch-b">Branch B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input id="first-name" type="text" placeholder="First Name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input id="last-name" type="text" placeholder="Last Name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" type="text" placeholder="Username" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Email" />
                </div>
                <div className="space-y-2 relative">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Password" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 h-8 w-8 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="space-y-2 relative">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input id="confirm-password" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 h-8 w-8 text-muted-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button type="submit" className="w-full">
                  Sign Up
                </Button>
              </form>
              <p className="mt-6 text-center text-sm">
                Already have an account?{" "}
                <Link href="/" className="text-primary hover:underline">
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
