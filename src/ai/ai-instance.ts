
import { genkit, type Genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// WARNING: API Key is hardcoded below for demonstration purposes.
// This is NOT recommended for production environments.
// For production, you should use environment variables to keep your API key secure.
// Example:
// const apiKey = process.env.GOOGLE_GENAI_API_KEY;
// if (!apiKey) {
//   throw new Error("GOOGLE_GENAI_API_KEY environment variable not set");
// }
//
// Then use `apiKey` in the googleAI() configuration.

const HARDCODED_API_KEY = "AIzaSyBVUKesPxyBcLIfj9Ga26JZtFg5OcpZokM";

let aiInstance: Genkit;

try {
  console.log("Attempting to initialize Genkit with a hardcoded API key...");

  aiInstance = genkit({
    plugins: [
      googleAI({
        apiKey: HARDCODED_API_KEY, // Using the hardcoded key.
      }),
    ],
    // No default model is set here to ensure each flow specifies the exact model needed.
    // This provides better control and avoids "Model not found" errors for specific tasks.
  });

  console.log("Genkit initialized successfully with hardcoded key. Each flow will specify its own model.");

} catch (error: any) {
  console.error('--------------------------------------------------------------------');
  console.error('!!! CRITICAL ERROR DURING GENKIT INITIALIZATION !!!');
  console.error('This error occurred even with a hardcoded API key. This could mean:');
  console.error('1. The provided API key is invalid, expired, or disabled.');
  console.error('2. The Google Cloud project associated with the key does not have the "Generative Language API" or "Vertex AI API" enabled.');
  console.error('3. There might be billing issues with the associated Google Cloud account.');
  console.error('4. There could be network connectivity issues blocking access to Google services.');
  console.error('Underlying error message:', error.message);
  console.error('--------------------------------------------------------------------');
  throw new Error(`GenkitInitializationFailed with hardcoded key: ${error.message}. Check server logs for details.`);
}

export const ai = aiInstance;
