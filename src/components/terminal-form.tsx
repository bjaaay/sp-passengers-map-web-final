
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { database } from "@/lib/firebase";
import { ref, push, onValue } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

const formSchema = z.object({
  municipality: z.string().min(1, { message: "Municipality is required." }),
  terminalName: z.string().min(1, { message: "Terminal name is required." }),
  address: z.string().min(1, { message: "Address is required." }),
});

interface Municipality {
  id: string;
  name: string;
}

export function TerminalForm() {
  const { toast } = useToast();
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      municipality: "",
      terminalName: "",
      address: "",
    },
  });

  useEffect(() => {
    const municipalitiesRef = ref(database, 'municipalities');
    const unsubscribe = onValue(municipalitiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedMunicipalities: Municipality[] = Object.keys(data).map(key => ({
          id: key,
          name: data[key].name
        }));
        setMunicipalities(loadedMunicipalities);
      } else {
        setMunicipalities([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const terminalsRef = ref(database, `municipalities/${values.municipality}/terminals`);
      await push(terminalsRef, {
        name: values.terminalName,
        address: values.address,
      });

      toast({
        title: "Success",
        description: "Terminal information has been saved.",
      });
      form.reset();
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="municipality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Municipality</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a municipality" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {municipalities.map(m => (
                    <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
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
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Enter terminal address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save Terminal</Button>
      </form>
    </Form>
  );
}
