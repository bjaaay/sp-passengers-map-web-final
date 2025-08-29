"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Menu, Link as LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ImageUploadPlaceholder } from "./image-upload-placeholder"

export function RegisterVehicleForm() {
  const [cor, setCor] = useState<File | null>(null)
  const [or, setOr] = useState<File | null>(null)

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-primary text-primary-foreground p-4 flex justify-between items-center">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Register Vehicle</h1>
        <Button variant="ghost" size="icon">
          <Menu />
        </Button>
      </header>
      <main className="flex-1 p-6 bg-secondary">
        <div className="max-w-md mx-auto bg-card p-6 rounded-lg shadow-md">
          <p className="text-sm text-red-500 mb-4">*The following details are required before becoming verified*</p>
          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="gps-tracker-id">GPS Tracker ID</Label>
              <Input id="gps-tracker-id" name="gps-tracker-id" placeholder="Enter GPS Tracker ID" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle-type">Vehicle Type</Label>
              <Select name="vehicle-type">
                <SelectTrigger id="vehicle-type">
                  <SelectValue placeholder="Select Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Jeepney">Jeepney</SelectItem>
                  <SelectItem value="Tricycle">Tricycle</SelectItem>
                  <SelectItem value="Trike">Trike</SelectItem>
                  <SelectItem value="Modern PUV">Modern PUV</SelectItem>
                  <SelectItem value="Van">Van</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plate-number">Vehicle Plate No.</Label>
              <Input id="plate-number" name="plate-number" placeholder="Enter Vehicle Plate No." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ImageUploadPlaceholder
                id="cor-upload"
                label="Certificate Of Registration"
                onFileChange={setCor}
              />
              <ImageUploadPlaceholder
                id="or-upload"
                label="Latest Official Receipt"
                onFileChange={setOr}
              />
            </div>
            
            <Button type="submit" className="w-full text-lg h-12">
              Register
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
