"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ImageUploadPlaceholder } from "./image-upload-placeholder"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form"
import { useToast } from "@/hooks/use-toast"
import { database } from "@/lib/firebase"
import { ref, set, get, query, equalTo, orderByChild } from "firebase/database"
import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { Terminal } from "lucide-react"

const checkGpsIdUniqueness = async (gpsTrackerId: string) => {
  const vehiclesRef = ref(database, 'vehicles');
  const q = query(vehiclesRef, orderByChild('gpsTrackerId'), equalTo(gpsTrackerId));
  const snapshot = await get(q);
  return !snapshot.exists();
};

const formSchema = z.object({
  gpsTrackerId: z.string().min(1, "GPS Tracker ID is required."),
  vehicleType: z.string({ required_error: "Please select a vehicle type." }),
  plateNumber: z.string().min(1, "Vehicle Plate No. is required.").regex(/^[A-Z0-9]+$/, "Plate number should only contain letters and numbers."),
  cor: z.any().refine(file => file, "Certificate of Registration is required."),
  or: z.any().refine(file => file, "Official Receipt is required."),
}).refine(async (data) => {
  if (!data.gpsTrackerId) return true; // Don't validate if empty, other rule will catch
  const isUnique = await checkGpsIdUniqueness(data.gpsTrackerId);
  return isUnique;
}, {
  message: "GPS Tracker ID already exists.",
  path: ["gpsTrackerId"],
});

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const TRACCAR_URL = "https://traccar.live-vehicles.site/api/devices";
const TRACCAR_AUTH = "Basic " + btoa("johvalenzuela@gbox.adnu.edu.ph:admin.Traccar");



export function RegisterVehicleForm() {
  const { toast } = useToast();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gpsTrackerId: "",
      plateNumber: "",
      cor: null,
      or: null
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setSuccessMessage(null);
    try {
      const corBase64 = await fileToBase64(values.cor);
      const orBase64 = await fileToBase64(values.or);

      const vehicleData = {
        gpsTrackerId: values.gpsTrackerId,
        vehicleType: values.vehicleType,
        plateNumber: values.plateNumber.toUpperCase(),
        corUrl: corBase64,
        orUrl: orBase64,
        registrationDate: new Date().toISOString(),
      };

      const dbRef = ref(database, `vehicles/${vehicleData.plateNumber}`);
      await set(dbRef, vehicleData);

      const traccarResponse = await fetch(TRACCAR_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": TRACCAR_AUTH,
        },
        body: JSON.stringify({
          name: vehicleData.plateNumber,
          uniqueId: vehicleData.gpsTrackerId,
        }),
      });
 
      if (!traccarResponse.ok) {
        const errorData = await traccarResponse.json();
        console.error("Traccar API error:", errorData)
        throw new Error("Failed to add device to Traccar. The device may already be registered in Traccar.");
      }


      setSuccessMessage(`Vehicle with plate number ${vehicleData.plateNumber} has been successfully registered.`);
      form.reset();

    } catch (error: any) {
      console.error("Error registering vehicle:", error);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 bg-card p-6 rounded-lg shadow-md">
        {!form.formState.isSubmitSuccessful && (
           <p className="text-sm text-red-500 mb-4">*All fields are required for verification*</p>
        )}

        {successMessage && (
           <Alert className="mb-6 border-green-500 text-green-700">
             <Terminal className="h-4 w-4" />
            <AlertTitle className="font-bold">Registration Successful!</AlertTitle>
            <AlertDescription>
              {successMessage}
            </AlertDescription>
          </Alert>
        )}
       
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             <FormField
              control={form.control}
              name="gpsTrackerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GPS ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter GPS Tracker ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="vehicleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Vehicle Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="jeepney">Jeepney</SelectItem>
                      <SelectItem value="tricycle">Tricycle</SelectItem>
                      <SelectItem value="etrike">E-trike</SelectItem>
                      <SelectItem value="modern_puv">Modern PUV</SelectItem>
                      <SelectItem value="uv_express">UV Express</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plateNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Plate No.</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Vehicle Plate No." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="cor"
                render={({ field }) => (
                  <FormItem>
                    <ImageUploadPlaceholder
                      id="cor-upload"
                      label="Certificate Of Registration"
                      onFileChange={(file) => field.onChange(file)}
                      value={field.value}
                    />
                    <FormMessage className="pl-1"/>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="or"
                render={({ field }) => (
                  <FormItem>
                    <ImageUploadPlaceholder
                      id="or-upload"
                      label="Latest Official Receipt"
                      onFileChange={(file) => field.onChange(file)}
                      value={field.value}
                    />
                    <FormMessage className="pl-1"/>
                  </FormItem>
                )}
              />
            </div>
            
            <Button type="submit" className="w-full text-lg h-12" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Registering..." : "Register"}
            </Button>
          </form>
        </Form>
      </main>
    </div>
  )
}
