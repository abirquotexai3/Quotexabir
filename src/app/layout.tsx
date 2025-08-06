import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import {Toaster} from '@/components/ui/toaster'; // Import Toaster

// Correctly instantiate Inter font
const inter = Inter({
  variable: '--font-inter', // Define CSS variable for Inter
  subsets: ['latin'],
});


export const metadata: Metadata = {
  title: 'Binary Vision', // Updated title
  description: 'AI-Powered Binary Options Chart Analysis', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Ensure no whitespace between html and body tags to prevent hydration errors
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
