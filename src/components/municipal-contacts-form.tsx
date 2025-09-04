
"use client";

import { useFieldArray, useForm } from "react-hook-form";
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
import { Separator } from "@/components/ui/separator";
import { database } from "@/lib/firebase";
import { ref, set, onValue } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Trash } from "lucide-react";

const formSchema = z.object({
  municipality: z.string().min(1, { message: "Municipality is required." }),
  emergency_hotlines: z.array(z.object({
    name: z.string().min(1, { message: "Hotline name is required." }),
    number: z.string().min(1, { message: "Hotline number is required." }),
  })).min(2, { message: "At least two emergency hotlines are required." }),
  important_contacts: z.array(z.object({
    name: z.string().min(1, { message: "Contact name is required." }),
    number: z.string().min(1, { message: "Contact number is required." }),
  })).min(2, { message: "At least two important contacts are required." }),
});

interface Municipality {
  id: string;
  name: string;
}

export function MunicipalContactsForm() {
  const { toast } = useToast();
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      municipality: "",
      emergency_hotlines: [{ name: "", number: "" }, { name: "", number: "" }],
      important_contacts: [{ name: "", number: "" }, { name: "", number: "" }],
    },
  });

  const { fields: hotlineFields, append: appendHotline, remove: removeHotline } = useFieldArray({
    control: form.control,
    name: "emergency_hotlines",
  });

  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control: form.control,
    name: "important_contacts",
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
      const hotlinesRef = ref(database, `municipalities/${values.municipality}/emergency_hotlines`);
      await set(hotlinesRef, values.emergency_hotlines);

      const contactsRef = ref(database, `municipalities/${values.municipality}/important_contacts`);
      await set(contactsRef, values.important_contacts);

      toast({
        title: "Success",
        description: "Municipal contacts have been saved.",
      });
      form.reset();
    } catch (error) {
      console.error("Error saving municipal contacts:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save municipal contacts.",
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
        
        <Separator />

        <div>
            <h3 className="text-lg font-medium">Emergency Hotlines</h3>
            <p className="text-sm text-muted-foreground">e.g., PNP, Fire Department, Hospital</p>
        </div>

        {hotlineFields.map((field, index) => (
          <div key={field.id} className="flex gap-4 items-start">
            <FormField
              control={form.control}
              name={`emergency_hotlines.${index}.name`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Hotline Name {index + 1}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., PNP Canaman" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`emergency_hotlines.${index}.number`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Hotline Number {index + 1}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 911" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {index > 1 && (
              <Button type="button" variant="outline" size="icon" className="mt-8" onClick={() => removeHotline(index)}>
                <Trash className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {form.formState.errors.emergency_hotlines && (
            <p className="text-sm font-medium text-destructive">
                {form.formState.errors.emergency_hotlines.message}
            </p>
        )}
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendHotline({ name: "", number: "" })}
        >
            Add another hotline
        </Button>

        <Separator />

        <div>
            <h3 className="text-lg font-medium">Important Contacts</h3>
            <p className="text-sm text-muted-foreground">e.g., Mayor, Tourism Officer</p>
        </div>

        {contactFields.map((field, index) => (
          <div key={field.id} className="flex gap-4 items-start">
            <FormField
              control={form.control}
              name={`important_contacts.${index}.name`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Contact Name {index + 1}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Juan Dela Cruz" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`important_contacts.${index}.number`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Contact Number {index + 1}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 0912-345-6789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {index > 1 && (
              <Button type="button" variant="outline" size="icon" className="mt-8" onClick={() => removeContact(index)}>
                <Trash className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {form.formState.errors.important_contacts && (
            <p className="text-sm font-medium text-destructive">
                {form.formState.errors.important_contacts.message}
            </p>
        )}
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendContact({ name: "", number: "" })}
        >
            Add another contact
        </Button>

        <Separator />

        <Button type="submit" className="mt-4">Save All Contacts</Button>
      </form>
    </Form>
  );
}
