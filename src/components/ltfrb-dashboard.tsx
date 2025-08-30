
"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ComplaintDashboard } from "@/components/complaint-dashboard"
import { RegisterVehicleForm } from "@/components/register-vehicle-form"
import { PassengersMapLogo } from './icons';
import { ProfileForm } from "./profile-form";
import { VehicleList } from "./vehicle-list";

export function LtfrbDashboard() {
  return (
    <div className="flex flex-col h-full bg-background">
       <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
         <div className="container mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <PassengersMapLogo className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">LTFRB Dashboard</h1>
            </div>
           </div>
         </div>
       </header>
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="complaints" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
            <TabsTrigger value="complaints">Complaints</TabsTrigger>
            <TabsTrigger value="register-vehicle">Register Vehicle</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
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
          <TabsContent value="profile" className="mt-6">
             <div className="max-w-2xl mx-auto">
              <ProfileForm />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
