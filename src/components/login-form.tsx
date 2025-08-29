"use client"

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PassengersMapLogo } from "@/components/icons";
import { Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Card className="overflow-hidden shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="bg-card p-8 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center text-center">
            <PassengersMapLogo className="h-20 w-20 text-primary mb-4" />
            <h1 className="text-4xl font-bold text-accent">Passengers</h1>
            <p className="text-sm tracking-[0.4em] text-primary font-medium">MAP</p>
          </div>
        </div>
        <div className="p-8 bg-card">
          <div className="flex flex-col justify-center h-full">
            <div className="w-full max-w-sm mx-auto">
              <h2 className="text-2xl font-semibold text-center text-primary mb-6">Login</h2>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email or Phone Number</Label>
                  <Input id="email" type="text" placeholder="Enter your email or phone" />
                </div>
                <div className="space-y-2 relative">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" />
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
                <div className="text-right">
                  <Link href="#" className="text-sm text-primary hover:underline">
                    Forgot Password?
                  </Link>
                </div>
                <Button type="submit" className="w-full">
                  Login
                </Button>
              </form>
              <p className="mt-6 text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link href="#" className="text-primary hover:underline">
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
