'use server';

/**
 * @fileOverview This file defines a unified Genkit flow for analyzing a screenshot of a binary options chart.
 * It validates the chart, predicts the next candle, generates an annotated image, and creates a risk disclaimer.
 * The entire process is wrapped in robust error handling to prevent server crashes.
 *
 * - analyzeScreenshot - The main exported flow function.
 * - AnalyzeScreenshotInput - The input type for the flow.
 * - AnalyzeScreenshotResult - The single, unified return type for the flow.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import { generateDisclaimer, GenerateDisclaimerInput } from './generate-disclaimer';

// 1. INPUT SCHEMA
const AnalyzeScreenshotInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A screenshot of a binary options chart, as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeScreenshotInput = z.infer<typeof AnalyzeScreenshotInputSchema>;


// 2. UNIFIED OUTPUT SCHEMA
const AnalyzeScreenshotResultSchema = z.object({
  success: z.boolean().describe('Whether the overall operation was successful.'),
  isValidChart: z.boolean().describe('Whether the uploaded image is a valid binary options chart.'),
  prediction: z.object({
      direction: z.enum(['UP', 'DOWN']),
      probability: z.number().min(0).max(1),
    }).optional().describe('The prediction details, if successful.'),
  annotatedImage: z.string().optional().describe('The annotated image data URI, if generated.'),
  disclaimer: z.string().optional().describe('The risk disclaimer text, if generated.'),
  error: z.string().optional().describe('An error message, if the operation failed.'),
});
export type AnalyzeScreenshotResult = z.infer<typeof AnalyzeScreenshotResultSchema>;


// 3. PROMPT for chart analysis and prediction
const analysisPrompt = ai.definePrompt({
  name: 'analysisPrompt',
  input: { schema: AnalyzeScreenshotInputSchema },
  output: {
    schema: z.object({
        isValidChart: z.boolean().describe('Return true only if the image is a binary options chart. Be strict. For photos of people, animals, objects, etc., return false.'),
        prediction: z.object({
            direction: z.enum(['UP', 'DOWN']).describe('The predicted direction of the next candle. Required only if isValidChart is true.'),
            probability: z.number().min(0).max(1).describe('The confidence probability (0-1). Required only if isValidChart is true.'),
        }).optional(),
    }),
  },
  prompt: `You are an AI specialized in analyzing binary options chart screenshots ONLY.
  Your MOST IMPORTANT task is to first determine if the provided image is ACTUALLY a binary options trading chart.
  - Set 'isValidChart' to true ONLY if it is clearly a binary options chart.
  - Set 'isValidChart' to false if the image is ANYTHING else. Be very strict.

  If and ONLY IF 'isValidChart' is true, analyze the chart and predict if the NEXT candle will go UP or DOWN, providing a probability.
  If 'isValidChart' is false, DO NOT provide any prediction data.

  Analyze the following image:
  {{media url=photoDataUri}}
  `,
  config: {
    model: 'googleai/gemini-pro-vision',
  }
});


// 4. TOOL for generating the annotated image
const generateAnnotatedImageTool = ai.defineTool({
  name: 'generateAnnotatedImageTool',
  description: 'Generates a professional, annotated image of a chart in ENGLISH, highlighting features that support a prediction.',
  inputSchema: z.object({
    photoDataUri: z.string().describe("The original chart screenshot data URI."),
    prediction: z.object({
      direction: z.enum(['UP', 'DOWN']),
      probability: z.number(),
    }),
  }),
  outputSchema: z.string().describe('The annotated image as a data URI.'),
},
async (input) => {
    const probabilityPercent = (input.prediction.probability * 100).toFixed(0);
    const { media } = await ai.generate({
      model: 'googleai/gemini-pro-vision', // Explicitly define the model here
      prompt: [
        {text: `
You are an expert technical analyst. Your task is to annotate the provided chart image.
**Instructions:**
1.  **Objective:** Your primary goal is to return a modified version of the input image with clear, professional annotations.
2.  **Language:** Use **ENGLISH ONLY** for all text annotations.
3.  **Watermark:** Add a semi-transparent watermark of the text "Quotex Ai 3.0" in the center of the image. The watermark should be noticeable but not obstruct the chart details.
4.  **Annotations:** Identify the 2-3 most important technical features (e.g., "Support Level", "Uptrend Line", "Bullish Engulfing") that support the given prediction. Use clean, thin, straight lines or arrows to point to these features from the text labels.
5.  **Font:** Use a clean, modern, and easily readable font for all text.
6.  **Style:** The final image must look professional, clean, and be easy to understand.
**Prediction Context (for your analysis):**
*   Direction: ${input.prediction.direction}
*   Probability: ${probabilityPercent}%
**IMPORTANT:** Your final output MUST BE **ONLY** the annotated image. The response should be the image data itself, which will be encoded as a data URI (e.g., "data:image/png;base64,..."). Do not output any other text, explanation, or markdown.
`},
        {media: {url: input.photoDataUri}}
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url || !media.url.startsWith('data:image')) {
        console.error("AI tool did not return a valid annotated image data URI. Raw output:", JSON.stringify(media, null, 2));
        throw new Error("AI tool did not return a valid annotated image data URI.");
    }
    return media.url;
});


// 5. UNIFIED FLOW - This is the main exported function
export const analyzeScreenshot = ai.defineFlow({
    name: 'analyzeScreenshotFlow',
    inputSchema: AnalyzeScreenshotInputSchema,
    outputSchema: AnalyzeScreenshotResultSchema,
}, async (input): Promise<AnalyzeScreenshotResult> => {
    console.log("--- Starting unified analyzeScreenshot flow ---");
    try {
        // Step 1: Run the analysis prompt
        const analysisResult = await analysisPrompt(input);
        const analysis = analysisResult.output;

        if (!analysis) {
            throw new Error("AI analysis prompt returned no output.");
        }

        if (!analysis.isValidChart) {
            console.log("AI determined image is not a valid chart.");
            return {
                success: false,
                isValidChart: false,
                error: 'শুধুমাত্র বাইনারি চার্টের স্ক্রিনশট আপলোড করুন (যেমন Quotex)। অন্য কোনো ছবি (মানুষ, বস্তু ইত্যাদি) গ্রহণ করা হবে না।',
            };
        }

        if (!analysis.prediction) {
            console.error("Valid chart detected, but AI failed to return a prediction.");
            return {
                success: false,
                isValidChart: true,
                error: 'AI বিশ্লেষণ একটি বৈধ চার্টের জন্য পূর্বাভাস দিতে ব্যর্থ হয়েছে৷ অনুগ্রহপূর্বক আবার চেষ্টা করুন.',
            };
        }

        const { prediction } = analysis;
        let annotatedImage: string | undefined;
        let disclaimer: string | undefined;

        // Step 2: Generate annotated image (non-critical)
        try {
            console.log("Attempting to generate annotated image...");
            annotatedImage = await generateAnnotatedImageTool({
                photoDataUri: input.photoDataUri,
                prediction: prediction,
            });
            console.log("Annotated image generated successfully.");
        } catch (imgError: any) {
            console.error("Non-critical error during image annotation:", imgError.message);
            annotatedImage = undefined; // Proceed without it
        }

        // Step 3: Generate disclaimer (non-critical)
        try {
            console.log("Attempting to generate disclaimer...");
            const disclaimerInput: GenerateDisclaimerInput = {
                prediction: prediction.direction,
                probability: prediction.probability,
            };
            const disclaimerResult = await generateDisclaimer(disclaimerInput);
            disclaimer = disclaimerResult.disclaimer;
            console.log("Disclaimer generated successfully.");
        } catch (discError: any) {
            console.error("Non-critical error during disclaimer generation:", discError.message);
            disclaimer = 'ঝুঁকি সতর্কতা তৈরি করা যায়নি। অনুগ্রহ করে দায়িত্বের সাথে ট্রেড করুন।';
        }

        // Step 4: Return final success object
        console.log("--- Unified flow finished successfully ---");
        return {
            success: true,
            isValidChart: true,
            prediction: prediction,
            annotatedImage: annotatedImage,
            disclaimer: disclaimer,
        };

    } catch (error: any) {
        // CATCH-ALL for any unexpected errors in the flow
        console.error("!!! Critical failure in analyzeScreenshot flow:", error, error.stack);
        return {
            success: false,
            isValidChart: false, // Assume failure means chart was invalid or process broke
            error: `একটি অপ্রত্যাশিত সার্ভার ত্রুটি ঘটেছে: ${error.message}`,
        };
    }
});
