// This file is machine-generated - edit with care!

'use server';

/**
 * @fileOverview This file contains a Genkit flow that uses AI to request further clarification on complaint details.
 *
 * - clarifyComplaintDetails - A function that calls the clarifyComplaintDetailsFlow.
 * - ClarifyComplaintDetailsInput - The input type for the clarifyComplaintDetails function.
 * - ClarifyComplaintDetailsOutput - The return type for the clarifyComplaintDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClarifyComplaintDetailsInputSchema = z.object({
  incidentPhotoDataUri: z
    .string()
    .describe(
      "A photo of the incident, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    )
    .optional(),
  vehicleType: z.string().describe('The type of vehicle involved.').optional(),
  licensePlateNumber: z.string().describe('The license plate number of the vehicle.').optional(),
  incidentRoute: z.string().describe('The route where the incident occurred.').optional(),
  incidentTime: z.string().describe('The time the incident occurred.').optional(),
  incidentDate: z.string().describe('The date the incident occurred.').optional(),
  description: z.string().describe('A description of the incident.').optional(),
});

export type ClarifyComplaintDetailsInput = z.infer<typeof ClarifyComplaintDetailsInputSchema>;

const ClarifyComplaintDetailsOutputSchema = z.object({
  clarificationRequest: z
    .string()
    .describe('A request for clarification from the user, if details are insufficient.'),
});

export type ClarifyComplaintDetailsOutput = z.infer<typeof ClarifyComplaintDetailsOutputSchema>;

export async function clarifyComplaintDetails(input: ClarifyComplaintDetailsInput): Promise<ClarifyComplaintDetailsOutput> {
  return clarifyComplaintDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'clarifyComplaintDetailsPrompt',
  input: {schema: ClarifyComplaintDetailsInputSchema},
  output: {schema: ClarifyComplaintDetailsOutputSchema},
  prompt: `You are an AI assistant helping to process complaint reports.  If the user has not provided enough information in their report, you will ask for more information. You should only ask for clarification if key details such as incident photo, vehicle type, date, time, and description are missing.  If the report is sufficiently detailed, respond with an empty string. Be specific about what information is needed.

Here are the details provided in the report:

{{#if incidentPhotoDataUri}}
Incident Photo: {{media url=incidentPhotoDataUri}}
{{else}}
No Incident Photo Provided
{{/if}}

{{#if vehicleType}}
Vehicle Type: {{{vehicleType}}}
{{else}}
Vehicle Type: Not Provided
{{/if}}

{{#if licensePlateNumber}}
License Plate Number: {{{licensePlateNumber}}}
{{else}}
License Plate Number: Not Provided
{{/if}}

{{#if incidentRoute}}
Incident Route: {{{incidentRoute}}}
{{else}}
Incident Route: Not Provided
{{/if}}

{{#if incidentTime}}
Incident Time: {{{incidentTime}}}
{{else}}
Incident Time: Not Provided
{{/if}}

{{#if incidentDate}}
Incident Date: {{{incidentDate}}}
{{else}}
Incident Date: Not Provided
{{/if}}

{{#if description}}
Description: {{{description}}}
{{else}}
Description: Not Provided
{{/if}}

Clarification Request:`,
});

const clarifyComplaintDetailsFlow = ai.defineFlow(
  {
    name: 'clarifyComplaintDetailsFlow',
    inputSchema: ClarifyComplaintDetailsInputSchema,
    outputSchema: ClarifyComplaintDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
