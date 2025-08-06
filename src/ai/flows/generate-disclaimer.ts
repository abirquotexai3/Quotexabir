'use server';

/**
 * @fileOverview Generates a binary risk disclaimer based on the predicted outcome.
 *
 * - generateDisclaimer - A function that generates the disclaimer.
 * - GenerateDisclaimerInput - The input type for the generateDisclaimer function.
 * - GenerateDisclaimerOutput - The return type for the generateDisclaimer function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateDisclaimerInputSchema = z.object({
  prediction: z
    .enum(['UP', 'DOWN'])
    .describe('The predicted direction (UP or DOWN).'),
  probability: z
    .number()
    .min(0)
    .max(1)
    .describe('The probability of the predicted direction (0 to 1).'),
});

export type GenerateDisclaimerInput = z.infer<typeof GenerateDisclaimerInputSchema>;

// Define the output schema internally
const GenerateDisclaimerOutputSchema = z.object({
  disclaimer: z.string().describe('The generated binary risk disclaimer.'),
});
// Export only the type
export type GenerateDisclaimerOutput = z.infer<typeof GenerateDisclaimerOutputSchema>;

export async function generateDisclaimer(input: GenerateDisclaimerInput): Promise<GenerateDisclaimerOutput> {
  const result = await generateDisclaimerFlow(input);
  // Validate the result against the internal schema before returning
  return GenerateDisclaimerOutputSchema.parse(result);
}

const generateDisclaimerPrompt = ai.definePrompt({
  name: 'generateDisclaimerPrompt',
  input: {
    schema: z.object({
      prediction: z
        .enum(['UP', 'DOWN'])
        .describe('The predicted direction (UP or DOWN).'),
      probability: z
        .number()
        .min(0)
        .max(1)
        .describe('The probability of the predicted direction (0 to 1).'),
    }),
  },
  output: {
    // Use the internal schema for the prompt output
    schema: GenerateDisclaimerOutputSchema,
  },
  prompt: `You are an AI assistant that generates risk disclaimers for binary options trading in BENGALI.

  Based on the predicted outcome ({{{prediction}}} with probability {{{probability}}}), generate a disclaimer in BENGALI that warns users about the risks involved in binary options trading. The disclaimer should be clear, concise, and informative.

  The disclaimer should include the following points in BENGALI:
  - Binary options trading involves a high degree of risk.
  - It is possible to lose all of your invested capital.
  - The prediction is not guaranteed to be accurate.
  - Users should only trade with capital they can afford to lose.
  - Users should seek independent financial advice if they are unsure about the risks involved.

  Here's an example structure in BENGALI:
  "বাইনারি বিকল্প ট্রেডিংয়ে উল্লেখযোগ্য ঝুঁকি জড়িত এবং এর ফলে আপনার সম্পূর্ণ বিনিয়োগ নষ্ট হতে পারে। {{{probability}}} সম্ভাবনাসহ {{{prediction}}} পূর্বাভাসের নিশ্চয়তা নেই। দায়িত্বের সাথে এবং শুধুমাত্র সেই পরিমাণ অর্থ দিয়ে ট্রেড করুন যা আপনি হারাতে সামর্থ্য রাখেন। প্রয়োজন হলে আর্থিক পরামর্শ নিন।"
  `,
  // Explicitly set the model to be used for this text generation task.
  config: {
      model: 'googleai/gemini-pro',
  }
});

const generateDisclaimerFlow = ai.defineFlow<
  typeof GenerateDisclaimerInputSchema,
  typeof GenerateDisclaimerOutputSchema // Use internal schema
>(
  {
    name: 'generateDisclaimerFlow',
    inputSchema: GenerateDisclaimerInputSchema,
    outputSchema: GenerateDisclaimerOutputSchema, // Use internal schema
  },
  async input => {
    const {output} = await generateDisclaimerPrompt(input);
    // Ensure output is not null before returning, although schema validation in the wrapper handles this too.
    if (!output) {
        throw new Error("Disclaimer generation prompt returned null output.");
    }
    return output;
  }
);
