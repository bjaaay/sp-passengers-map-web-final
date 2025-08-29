"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { classifyComplaintType } from "@/ai/flows/classify-complaint-type"
import { clarifyComplaintDetails } from "@/ai/flows/clarify-complaint-details"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/date-picker"
import type { Complaint } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Sparkles, AlertTriangle } from "lucide-react"

const formSchema = z.object({
  incidentPhoto: z.any().refine(file => file?.length == 1, "Photo is required."),
  vehicleType: z.enum(["Jeepney", "Tricycle", "Trike", "Modern PUV", "Van"]),
  licensePlate: z.string().min(3, "License plate must be at least 3 characters."),
  route: z.string().min(1, "Route is required."),
  incidentDate: z.date({ required_error: "Incident date is required." }),
  incidentTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  complaintType: z.string().optional(),
})

type NewReportFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddReport: (report: Complaint) => void;
}

export function NewReportDialog({ isOpen, onOpenChange, onAddReport }: NewReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isClassifying, setIsClassifying] = useState(false)
  const [clarification, setClarification] = useState<string | null>(null)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      licensePlate: "",
      route: "",
      incidentTime: "",
      description: "",
    },
  })

  const fileRef = form.register("incidentPhoto");

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });

  const handleClassify = async () => {
    const photoFile = form.getValues("incidentPhoto")?.[0];
    if (!photoFile) {
      toast({
        variant: "destructive",
        title: "Photo required",
        description: "Please select a photo to classify the complaint.",
      });
      return;
    }

    setIsClassifying(true);
    try {
      const photoDataUri = await toBase64(photoFile);
      const result = await classifyComplaintType({ photoDataUri });
      form.setValue("complaintType", result.complaintType);
      toast({
        title: "Classification Complete",
        description: `Complaint classified as: ${result.complaintType}`,
      });
    } catch (error) {
      console.error("Classification failed:", error);
      toast({
        variant: "destructive",
        title: "Classification Failed",
        description: "Could not classify the complaint type from the photo.",
      });
    } finally {
      setIsClassifying(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    setClarification(null);

    const photoDataUri = await toBase64(values.incidentPhoto[0]);
    
    try {
      const clarificationResult = await clarifyComplaintDetails({
        incidentPhotoDataUri: photoDataUri,
        vehicleType: values.vehicleType,
        licensePlateNumber: values.licensePlate,
        incidentRoute: values.route,
        incidentTime: values.incidentTime,
        incidentDate: values.incidentDate.toISOString().split("T")[0],
        description: values.description,
      });

      if (clarificationResult.clarificationRequest) {
        setClarification(clarificationResult.clarificationRequest);
        setIsSubmitting(false);
        return;
      }
      
      const newReport: Complaint = {
        id: Date.now().toString(),
        incidentPhotoUrl: URL.createObjectURL(values.incidentPhoto[0]),
        incidentPhotoAiHint: "new report",
        vehicleType: values.vehicleType,
        licensePlate: values.licensePlate,
        route: values.route,
        incidentTime: values.incidentTime,
        incidentDate: values.incidentDate.toISOString().split("T")[0],
        description: values.description,
        status: "New",
        complaintType: values.complaintType || "Other",
      };

      onAddReport(newReport);
      toast({
        title: "Report Submitted",
        description: "Your complaint has been successfully submitted.",
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Submission failed:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>File a New Complaint</DialogTitle>
          <DialogDescription>
            Please provide all the details about the incident.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="incidentPhoto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Incident Photo</FormLabel>
                  <FormControl>
                    <Input type="file" accept="image/*" {...fileRef} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Jeepney">Jeepney</SelectItem>
                        <SelectItem value="Tricycle">Tricycle</SelectItem>
                        <SelectItem value="Trike">Trike</SelectItem>
                        <SelectItem value="Modern PUV">Modern PUV</SelectItem>
                        <SelectItem value="Van">Van</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="licensePlate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Plate</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ABC-1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="route"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Route / Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Main St & 2nd Ave" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="incidentDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="mb-1.5">Incident Date</FormLabel>
                    <DatePicker date={field.value} setDate={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="incidentTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the incident in detail." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex flex-col sm:flex-row gap-2">
              <FormField
                control={form.control}
                name="complaintType"
                render={({ field }) => (
                  <FormItem className="flex-1">
                     <FormLabel>Complaint Type (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-classified by AI" {...field} readOnly />
                    </FormControl>
                  </FormItem>
                )}
              />
               <Button type="button" variant="outline" onClick={handleClassify} disabled={isClassifying} className="mt-auto">
                {isClassifying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                AI Classify
              </Button>
            </div>
            
            {clarification && (
              <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4 dark:bg-yellow-950">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">More Information Needed</h3>
                    <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <p>{clarification}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Report
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
