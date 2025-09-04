
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { database } from "@/lib/firebase";
import { ref, set, onValue } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const formSchema = z.object({
  municipalityName: z.string().min(1, { message: "Municipality name is required." }),
});

export function MunicipalityForm() {
  const { toast } = useToast();
  const [municipalities, setMunicipalities] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      municipalityName: "",
    },
  });

  useEffect(() => {
    const municipalitiesRef = ref(database, 'municipalities');
    const unsubscribe = onValue(municipalitiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMunicipalities(Object.keys(data));
      } else {
        setMunicipalities([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const existingMunicipality = municipalities.find(
      (m) => m.toLowerCase() === values.municipalityName.toLowerCase()
    );

    if (existingMunicipality) {
      toast({
        variant: "destructive",
        title: "Duplicate Municipality",
        description: `"${values.municipalityName}" already exists.`,
      });
      return; 
    }

    try {
      const municipalitiesRef = ref(database, `municipalities/${values.municipalityName}`);
      await set(municipalitiesRef, { name: values.municipalityName });

      toast({
        title: "Success",
        description: "Municipality has been saved.",
      });
      form.reset();
    } catch (error) {
      console.error("Error saving municipality:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save municipality.",
      });
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Add New Municipality</CardTitle>
           <CardDescription>Enter the name of a new municipality to add to the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="municipalityName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Municipality Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter municipality name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Save Municipality</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Existing Municipalities</CardTitle>
           <CardDescription>This is a list of municipalities already in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {municipalities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {municipalities.map(name => (
                <span key={name} className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-sm font-medium">
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No municipalities added yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
