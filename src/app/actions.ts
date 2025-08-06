'use server';

// Import flows here to register them in the Next.js server environment
import '@/ai/flows/analyze-screenshot.ts';
import '@/ai/flows/generate-disclaimer.ts';
import { authenticateUser } from '@/lib/auth'; // Import authentication function

import {z} from 'zod';
// Import the new unified flow and its result type
import { analyzeScreenshot, type AnalyzeScreenshotResult } from '@/ai/flows/analyze-screenshot';

// Define the schema for the input data
const AnalyzeSchema = z.object({
  photoDataUri: z.string().refine(
    (uri) => uri.startsWith('data:image/'),
    {
      message: 'অবৈধ চিত্রের ডেটা ইউআরআই ফর্ম্যাট। "data:image/" দিয়ে শুরু হতে হবে।', // "Invalid image data URI format..." - Bengali
    }
  ),
});


// Updated signature to work with useActionState, using the new unified result type
export async function handleAnalyzeScreenshot(
    previousState: AnalyzeScreenshotResult | null, // Use the new type
    formData: FormData
): Promise<AnalyzeScreenshotResult> { // Return the new type
   console.log(">>> handleAnalyzeScreenshot action started.");
  const photoDataUri = formData.get('screenshot') as string | null;

  // Basic check for missing data
  if (!photoDataUri) {
    console.error("Error in handleAnalyzeScreenshot: No screenshot data URI found in FormData.");
    return {
        success: false,
        isValidChart: false,
        error: 'কোনো স্ক্রিনশট প্রদান করা হয়নি।', // "No screenshot provided." - Bengali
    };
  }
   console.log("Screenshot data URI found (first ~50 chars):", photoDataUri.substring(0, 50));


  // Validate the data URI format
  const validationResult = AnalyzeSchema.safeParse({ photoDataUri });
  if (!validationResult.success) {
    const errorMessage = validationResult.error.flatten().fieldErrors.photoDataUri?.join(', ') || 'অবৈধ চিত্রের ফর্ম্যাট।'; // "Invalid image format." - Bengali
    console.error('Validation Error in handleAnalyzeScreenshot:', errorMessage);
    return {
        success: false,
        isValidChart: false,
        error: errorMessage
    };
  }
  console.log("Screenshot data URI passed validation.");

  // Use the validated data URI
  const validatedPhotoDataUri = validationResult.data.photoDataUri;

  try {
    console.log("Calling analyzeScreenshot AI flow from action...");
    // Call the flow and directly return its result. The flow now handles all internal
    // error handling and returns a predictable, flat structure.
    const flowResult: AnalyzeScreenshotResult = await analyzeScreenshot({ photoDataUri: validatedPhotoDataUri });
    console.log("analyzeScreenshot AI flow completed. Result success:", flowResult.success);
     if (!flowResult.success) {
       console.error("analyzeScreenshot flow returned error:", flowResult.error);
     }
     console.log("<<< handleAnalyzeScreenshot action finished successfully (flow executed).");
    return flowResult;

  } catch (error: any) {
    // This outer catch block is a final safeguard against catastrophic server failure.
    // The refactored flow should prevent this from being hit in most cases.
    console.error('!!! Unexpected critical error in handleAnalyzeScreenshot action:', error, error.stack);
    return {
        success: false,
        isValidChart: false,
        error: `একটি অপ্রত্যাশিত সার্ভার ত্রুটি ঘটেছে: ${error.message || 'অজানা ত্রুটি'}` // "An unexpected server error occurred..." - Bengali
    };
  }
}

// --- Authentication Action ---
const LoginSchema = z.object({
    userId: z.string().min(1, { message: 'ব্যবহারকারী আইডি প্রয়োজন' }), // "User ID is required" - Bengali
    password: z.string().min(1, { message: 'পাসওয়ার্ড প্রয়োজন' }), // "Password is required" - Bengali
});

interface LoginResult {
    success: boolean;
    error?: string;
}

export async function handleLogin(
    previousState: LoginResult | null,
    formData: FormData
): Promise<LoginResult> {
    console.log(">>> handleLogin action started.");
    const userId = formData.get('userId') as string | null;
    const password = formData.get('password') as string | null;

    const validationResult = LoginSchema.safeParse({ userId, password });

    if (!validationResult.success) {
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const formattedError = Object.values(errorMessages).flat().join(', ');
        console.error('Login validation failed:', formattedError);
        return { success: false, error: formattedError || 'অবৈধ ইনপুট।' }; // "Invalid input." - Bengali
    }

    const validatedUserId = validationResult.data.userId;
    const validatedPassword = validationResult.data.password;

    try {
        const result = await authenticateUser(validatedUserId, validatedPassword);
        console.log("<<< handleLogin action finished. Success:", result.success);
        return result;
    } catch (error: any) {
        console.error('!!! Critical error during authentication:', error);
        return { success: false, error: 'প্রমাণীকরণের সময় একটি ত্রুটি ঘটেছে।' }; // "An error occurred during authentication." - Bengali
    }
}
