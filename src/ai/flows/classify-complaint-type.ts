'use server';

/**
 * @fileOverview AI-powered tool that uses incident photos to classify the complaint type.
 *
 * - classifyComplaintType - A function that handles the complaint classification process.
 * - ClassifyComplaintTypeInput - The input type for the classifyComplaintType function.
 * - ClassifyComplaintTypeOutput - The return type for the classifyComplaintType function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClassifyComplaintTypeInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the incident, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ClassifyComplaintTypeInput = z.infer<typeof ClassifyComplaintTypeInputSchema>;

const ClassifyComplaintTypeOutputSchema = z.object({
  complaintType: z.string().describe('The classified type of complaint.'),
});
export type ClassifyComplaintTypeOutput = z.infer<typeof ClassifyComplaintTypeOutputSchema>;

export async function classifyComplaintType(input: ClassifyComplaintTypeInput): Promise<ClassifyComplaintTypeOutput> {
  return classifyComplaintTypeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'classifyComplaintTypePrompt',
  input: {schema: ClassifyComplaintTypeInputSchema},
  output: {schema: ClassifyComplaintTypeOutputSchema},
  prompt: `You are an AI assistant specializing in classifying complaint types based on incident photos.

  Analyze the following photo and classify the complaint type. Use the following photo as the primary source of information.

  Photo: {{media url=photoDataUri}}

  Respond with a single word that best describes the type of complaint.  Possible answers: [Parking, Traffic, Noise, Vandalism, Other]`,
});

const classifyComplaintTypeFlow = ai.defineFlow(
  {
    name: 'classifyComplaintTypeFlow',
    inputSchema: ClassifyComplaintTypeInputSchema,
    outputSchema: ClassifyComplaintTypeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
