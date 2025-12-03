
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { auth, database } from "@/lib/firebase";
import { ref, push, onValue } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import Image from "next/image";
import { onAuthStateChanged } from "firebase/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { MapPicker } from "./map-picker.tsx";
import { MapsProvider } from "./maps-provider.tsx";

const formSchema = z.object({
  terminalName: z.string().min(1, { message: "Terminal name is required." }),
  address: z.string().optional(),
  latitude: z.number({ required_error: "Latitude is required." }),
  longitude: z.number({ required_error: "Longitude is required." }),
  imageUrl: z.string().min(1, { message: "An image is required." }),
});

export function TerminalForm() {
  const { toast } = useToast();
  const [municipality, setMunicipality] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      terminalName: "",
      address: "",
      imageUrl: "",
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = ref(database, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
          const data = snapshot.val();
          if (data && data.municipality) {
            setMunicipality(data.municipality);
          }
        });
      } else {
        setMunicipality(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLocationSelect = (location: { lat: number; lng: number }) => {
    form.setValue("latitude", location.lat);
    form.setValue("longitude", location.lng);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!municipality) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not determine the user's municipality.",
      });
      return;
    }

    try {
      const terminalsRef = ref(database, `municipalities/${municipality}/terminals`);
      await push(terminalsRef, {
        name: values.terminalName,
        address: values.address,
        latitude: values.latitude,
        longitude: values.longitude,
        imageUrl: values.imageUrl,
      });

      toast({
        title: "Success",
        description: "Terminal information has been saved.",
      });
      form.reset();
      setImagePreview(null);
    } catch (error) {
      console.error("Error saving terminal information:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save terminal information.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Terminal</CardTitle>
        {municipality && <CardDescription>You are adding a terminal for: <strong>{municipality}</strong></CardDescription>}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="terminalName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terminal Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Central Terminal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter terminal address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Pinpoint Location</FormLabel>
              <MapsProvider>
                <MapPicker onLocationSelect={handleLocationSelect} />
              </MapsProvider>
            </div>

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terminal Image</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const base64String = reader.result as string;
                            field.onChange(base64String);
                            setImagePreview(base64String);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {imagePreview && (
              <div className="mt-4 w-full flex justify-center">
                <Image src={imagePreview} alt="Image Preview" width={200} height={200} style={{ objectFit: 'cover', borderRadius: '8px' }} />
              </div>
            )}

            <Button type="submit" disabled={!municipality}>Save Terminal</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
