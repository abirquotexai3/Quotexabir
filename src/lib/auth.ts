'use server';

import { z } from 'zod';

// Define expected environment variables (optional, for clarity)
const AuthEnvSchema = z.object({
  ADMIN_UID: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

// Parse environment variables (or use defaults)
const env = AuthEnvSchema.parse(process.env);
const ADMIN_UID = env.ADMIN_UID || 'admin';
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || 'password123';

interface AuthenticationResult {
  success: boolean;
  error?: string;
}

/**
 * Authenticates a user based on provided user ID and password.
 * Compares against environment variables or default credentials.
 * @param userId - The user ID entered by the user.
 * @param password - The password entered by the user.
 * @returns A promise that resolves to an AuthenticationResult object.
 */
export async function authenticateUser(userId: string, password: string): Promise<AuthenticationResult> {
  console.log(`Attempting authentication for user: ${userId}`); // Log attempt

  // Securely compare credentials (avoid timing attacks if possible, though less critical here)
  const isUserIdValid = userId === ADMIN_UID;
  const isPasswordValid = password === ADMIN_PASSWORD;

  if (isUserIdValid && isPasswordValid) {
    console.log(`Authentication successful for user: ${userId}`);
    return { success: true };
  } else {
    console.log(`Authentication failed for user: ${userId}`);
    return {
        success: false,
        // Provide a generic error message in Bengali for the user
        error: 'অবৈধ ব্যবহারকারী আইডি বা পাসওয়ার্ড।', // "Invalid user ID or password." - Bengali
    };
  }
}
