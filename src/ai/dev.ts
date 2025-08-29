import { config } from 'dotenv';
config();

import '@/ai/flows/classify-complaint-type.ts';
import '@/ai/flows/clarify-complaint-details.ts';