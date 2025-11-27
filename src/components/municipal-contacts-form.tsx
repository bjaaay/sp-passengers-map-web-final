
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { auth, database } from "@/lib/firebase";
import { ref, set, onValue, push, remove } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Trash } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const formSchema = z.object({
  name: z.string().min(1, { message: "Hotline name is required." }),
  number: z.string().min(1, { message: "Hotline number is required." }),
});

interface Hotline {
  id: string;
  name: string;
  number: string;
}

export function MunicipalContactsForm() {
  const { toast } = useToast();
  const [municipality, setMunicipality] = useState<string | null>(null);
  const [hotlines, setHotlines] = useState<Hotline[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      number: "",
    },
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = ref(database, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
          const data = snapshot.val();
          if (data && data.municipality) {
            const currentMunicipality = data.municipality;
            setMunicipality(currentMunicipality);

            const hotlinesRef = ref(database, `municipalities/${currentMunicipality}/emergency_hotlines`);
            onValue(hotlinesRef, (hotlineSnapshot) => {
              const hotlineData = hotlineSnapshot.val();
              if (hotlineData) {
                const loadedHotlines: Hotline[] = Object.keys(hotlineData).map(key => ({
                  id: key,
                  ...hotlineData[key]
                }));
                setHotlines(loadedHotlines);
              } else {
                setHotlines([]);
              }
            });
          }
        });
      } else {
        setMunicipality(null);
        setHotlines([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!municipality) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not determine the user\'s municipality.",
      });
      return;
    }

    try {
      const hotlinesRef = ref(database, `municipalities/${municipality}/emergency_hotlines`);
      await push(hotlinesRef, values);

      toast({
        title: "Success",
        description: "Emergency hotline has been saved.",
      });
      form.reset();
    } catch (error) {
      console.error("Error saving emergency hotline:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save emergency hotline.",
      });
    }
  };

  const handleDelete = async (hotlineId: string) => {
    if (!municipality) return;
    try {
      const hotlineRef = ref(database, `municipalities/${municipality}/emergency_hotlines/${hotlineId}`);
      await remove(hotlineRef);
      toast({
        title: "Success",
        description: "Hotline has been deleted.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete hotline.",
      });
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Add New Emergency Hotline</CardTitle>
          <CardDescription>Enter the details of a single emergency hotline.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex gap-4 items-start">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Hotline Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., PNP Canaman" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Hotline Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 911" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={!municipality}>Save Hotline</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Emergency Hotlines</CardTitle>
          <CardDescription>This is a list of emergency hotlines for your municipality.</CardDescription>
        </CardHeader>
        <CardContent>
          {hotlines.length > 0 ? (
            <div className="space-y-4">
              {hotlines.map(hotline => (
                <div key={hotline.id} className="flex items-center justify-between p-2 rounded-md border">
                  <div>
                    <p className="font-medium">{hotline.name}</p>
                    <p className="text-sm text-muted-foreground">{hotline.number}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(hotline.id)}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No emergency hotlines added yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
