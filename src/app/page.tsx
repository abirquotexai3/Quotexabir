import { UploadForm } from '@/components/upload-form';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-12 bg-gradient-to-br from-background to-secondary/30 dark:from-background dark:to-secondary/20"> {/* Added subtle gradient */}
       <div className="container mx-auto flex flex-col items-center gap-10"> {/* Increased gap */}
          <header className="text-center">
            {/* Optional: Add a logo here if desired */}
            {/* <Image src="/logo.svg" alt="Binary Vision Logo" width={150} height={50} /> */}
            <h1 className="text-4xl font-extrabold tracking-tight text-primary mt-4 lg:text-5xl drop-shadow-md">
              Quotex Ai 3.0
            </h1>
            <p className="mt-3 text-lg text-muted-foreground"> {/* Increased margin-top */}
              Your AI assistant for binary options chart analysis.
            </p>
          </header>

          <UploadForm />

          <footer className="mt-12 text-center text-base font-semibold text-foreground"> {/* Increased font size, weight and changed color */}
            <p suppressHydrationWarning>© {new Date().getFullYear()} Quotex Ai 3.0 All rights reserved.</p>
            <p className="mt-1 font-normal text-sm text-muted-foreground">Built with AI by <span className="font-semibold text-primary">Abir Studio</span></p> {/* Highlighted Abir Studio */}
          </footer>
       </div>
    </main>
  );
}
