'use client';

import React, { useActionState, useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useFormStatus } from 'react-dom';
import { UploadCloud, AlertCircle, TrendingUp, TrendingDown, Bot, ExternalLink, XCircle, History, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { handleAnalyzeScreenshot } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { AnalyzeScreenshotResult } from '@/ai/flows/analyze-screenshot';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';


// Type definition for a history item
type AnalysisHistoryItem = {
  id: string;
  timestamp: string; // ISO string
  prediction: {
    direction: 'UP' | 'DOWN';
    probability: number;
  };
};

const initialState: AnalyzeScreenshotResult = {
  success: false,
  isValidChart: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
        type="submit"
        disabled={pending}
        className="w-full mt-4 text-lg py-6"
        aria-label="Analyse Screenshot"
        variant="accent"
    >
      {pending ? (
        <>
          <Bot className="mr-2 h-5 w-5 animate-spin" /> Analyzing...
        </>
      ) : (
        <>
          <Bot className="mr-2 h-5 w-5" /> Analyse Screenshot
        </>
      )}
    </Button>
  );
}

export function UploadForm() {
  const [analysisState, analysisFormAction, isAnalysisPending] = useActionState(handleAnalyzeScreenshot, initialState);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const analysisStartedRef = useRef(false);

  // Load history from localStorage on initial client render
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('screenshotHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to parse history from localStorage", error);
      localStorage.removeItem('screenshotHistory'); // Clear corrupted data
    }
  }, []);

  const getNextScreenshotId = (): string => {
      let currentId = parseInt(localStorage.getItem('screenshotCounter') || '0', 10);
      currentId += 1;
      localStorage.setItem('screenshotCounter', currentId.toString());
      return `#${currentId}`;
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('screenshotHistory');
    localStorage.removeItem('screenshotCounter'); // Also reset the counter
    toast({
      title: "History Cleared",
      description: "Your analysis history has been removed.",
    });
  };


   const clearPreviewAndState = useCallback(() => {
      console.log("Clearing preview and state...");
      setPreview(null);
      setFileName(null);
      setUploadProgress(0);
      analysisStartedRef.current = false;
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (formRef.current) {
        formRef.current.reset();
      }
   }, []);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFile(file);
  };

  const handleFile = useCallback((file: File | undefined | null) => {
     if (!isAnalysisPending) {
        clearPreviewAndState();
     } else {
         console.log("Analysis pending, delaying clearPreviewAndState");
         return;
     }


    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      setUploadProgress(0);
      let progressInterval: NodeJS.Timeout | null = null;
       let simulatedProgress = 0;


      reader.onloadstart = () => {
         console.log("File reading started...");
         setUploadProgress(1);
          if (!reader.onprogress) {
            progressInterval = setInterval(() => {
                simulatedProgress = Math.min(simulatedProgress + 10, 95);
                setUploadProgress(simulatedProgress);
            }, 100);
          }
      };

      reader.onprogress = (event) => {
         if (event.lengthComputable) {
           const percentage = Math.round((event.loaded * 100) / event.total);
           console.log(`File reading progress: ${percentage}%`);
            if (progressInterval) {
                 clearInterval(progressInterval);
                 progressInterval = null;
            }
           setUploadProgress(percentage);
         } else {
              console.log("File reading progress: Not computable");
              if (!progressInterval) {
                 progressInterval = setInterval(() => {
                    simulatedProgress = Math.min(simulatedProgress + 10, 95);
                    setUploadProgress(simulatedProgress);
                 }, 100);
              }
         }
      };

      reader.onloadend = () => {
        console.log("File reading finished.");
        if (progressInterval) clearInterval(progressInterval);
        setUploadProgress(100);
        const result = reader.result as string;
        setPreview(result);
        setFileName(file.name);

         const hiddenInput = formRef.current?.elements.namedItem('screenshot') as HTMLInputElement | null;
         if (hiddenInput) {
             hiddenInput.value = result;
             console.log("Hidden input 'screenshot' updated.");
         } else {
             console.error("Could not find hidden input 'screenshot' to update!");
         }

        setTimeout(() => setUploadProgress(0), 500);
      };

      reader.onerror = (error) => {
         console.error("File Reading Error:", error);
         if (progressInterval) clearInterval(progressInterval);
         setUploadProgress(0);
         toast({
             title: "ফাইল পড়তে ত্রুটি",
             description: "নির্বাচিত ফাইলটি পড়া যায়নি।",
             variant: "destructive",
         });
         clearPreviewAndState();
      };

      reader.readAsDataURL(file);

    } else {
      if (!isAnalysisPending) {
          clearPreviewAndState();
          if (file) {
              toast({
                title: "অবৈধ ফাইলের প্রকার",
                description: "অনুগ্রহ করে একটি চিত্র ফাইল আপলোড করুন (যেমন PNG, JPG)।",
                variant: "destructive",
              });
          }
      }
    }
  }, [clearPreviewAndState, toast, isAnalysisPending]);


  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isAnalysisPending && uploadProgress === 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

     if (isAnalysisPending || uploadProgress > 0) {
         console.log("Drop ignored: Analysis or upload in progress.");
         return;
     }


    const file = event.dataTransfer.files?.[0];

     if (fileInputRef.current) {
       const dataTransfer = new DataTransfer();
        if(file) {
           dataTransfer.items.add(file);
        }
       fileInputRef.current.files = dataTransfer.files;
     }

     handleFile(file);

  }, [handleFile, isAnalysisPending, uploadProgress]);


  const handleBrowseClick = () => {
     if (!preview && !isAnalysisPending && uploadProgress === 0) {
       fileInputRef.current?.click();
     }
  };

   useEffect(() => {
     if (isAnalysisPending && !analysisStartedRef.current) {
       analysisStartedRef.current = true;
       console.log("Analysis pending state detected, analysis started.");
     }
     if (!isAnalysisPending && !preview) {
         analysisStartedRef.current = false;
     }
   }, [isAnalysisPending, preview]);

  useEffect(() => {
    if (analysisStartedRef.current && !isAnalysisPending) {
        console.log("Analysis finished, evaluating result state:", analysisState);

        if (analysisState.success && analysisState.isValidChart && analysisState.prediction) {
           toast({
             title: "বিশ্লেষণ সম্পন্ন",
             description: "পূর্বাভাস সফলভাবে তৈরি হয়েছে।",
             variant: 'default',
             className: 'bg-green-100 border-green-300 dark:bg-green-900 dark:border-green-700 text-green-800 dark:text-green-200'
           });

            const newHistoryItem: AnalysisHistoryItem = {
                id: getNextScreenshotId(),
                timestamp: new Date().toISOString(),
                prediction: analysisState.prediction,
            };

            setHistory(prevHistory => {
                const updatedHistory = [newHistoryItem, ...prevHistory].slice(0, 10); // Keep last 10 results
                try {
                    localStorage.setItem('screenshotHistory', JSON.stringify(updatedHistory));
                } catch (error) {
                    console.error("Failed to save history to localStorage", error);
                }
                return updatedHistory;
            });

        } else if (analysisState.error) {
           const isInvalidChartError = analysisState.error.includes('শুধুমাত্র বাইনারি চার্টের');
           const isFormatError = analysisState.error.includes('অবৈধ চিত্রের');

           toast({
             title: isInvalidChartError || isFormatError ? "অবৈধ ইনপুট" : "বিশ্লেষণ ব্যর্থ",
             description: analysisState.error,
             variant: "destructive",
           });

           if (isInvalidChartError || isFormatError || !analysisState.isValidChart) {
             setTimeout(clearPreviewAndState, 100);
           }
        } else if (!analysisState.success && !analysisState.error) {
            toast({
                title: "বিশ্লেষণ ব্যর্থ",
                description: "একটি অজানা ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
                variant: "destructive",
            });
        }

        analysisStartedRef.current = false;
    }
  }, [analysisState, isAnalysisPending, toast, clearPreviewAndState]);


  const probabilityPercentage = analysisState.success && analysisState.prediction?.probability !== undefined
    ? (analysisState.prediction.probability * 100).toFixed(0)
    : null;

  const isPredictionUp = analysisState.success && analysisState.prediction?.direction === 'UP';

   const showUploadPrompt = !preview && !isAnalysisPending && uploadProgress === 0;
   const showPreview = preview && !isAnalysisPending && uploadProgress === 0;
   const showUploading = uploadProgress > 0 && uploadProgress < 100;
   const showAnalyzing = isAnalysisPending;

  return (
    <>
    <Card className="w-full max-w-3xl mx-auto shadow-xl rounded-xl overflow-hidden bg-card">
      <CardHeader className="bg-gradient-to-r from-primary to-accent/80 text-primary-foreground rounded-t-xl p-4">
        <CardTitle className="text-2xl font-bold text-center tracking-wider">Quotex Ai 3.0</CardTitle>
        <CardDescription className="text-center text-primary-foreground/80 mt-1">
          স্ক্রিনশট আপলোড করুন, AI বলবে পরের ক্যান্ডেল UP না DOWN!
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 md:p-8">
        <form action={analysisFormAction} ref={formRef} className="space-y-6">
          <div
             className={cn(
                `relative flex justify-center items-center w-full p-6 border-2 border-dashed rounded-lg transition-all duration-300 ease-in-out min-h-[250px]`,
                isDragging ? 'border-accent bg-accent/10 scale-105 shadow-md' : 'border-border hover:border-primary/50',
                preview && !showAnalyzing ? 'border-solid border-primary/30 p-2' : '',
                (showAnalyzing || showUploading) ? 'cursor-default' : 'cursor-pointer',
                 {'bg-muted/20 dark:bg-muted/10': isDragging}
             )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
          >
            <input
              type="file"
              name="screenshotFile"
              ref={fileInputRef}
              className="hidden"
              accept="image/png, image/jpeg, image/gif, image/webp"
              onChange={handleFileChange}
              disabled={showAnalyzing || showUploading}
            />
            <input type="hidden" name="screenshot" value={preview ?? ""} />


            {(showUploading || showAnalyzing) && (
               <div className="absolute inset-0 flex flex-col justify-center items-center bg-background/80 dark:bg-background/90 rounded-md backdrop-blur-sm z-10 p-4 text-center">
                 {showUploading ? (
                   <>
                     <Progress value={uploadProgress} className="w-3/4 md:w-1/2 mb-3 h-2.5 rounded-full" />
                     <p className="text-base font-medium text-primary animate-pulse">Uploading ({uploadProgress}%)</p>
                     <p className="text-sm text-muted-foreground mt-1">Please wait...</p>
                   </>
                 ) : (
                   <>
                     <Bot className="h-12 w-12 animate-spin text-accent mb-3" />
                     <p className="text-lg font-semibold text-accent animate-pulse">AI is analyzing</p>
                     <p className="text-sm text-muted-foreground mt-1">This might take a moment...</p>
                   </>
                 )}
               </div>
            )}

            <div className={cn("transition-opacity duration-300 w-full", (showUploading || showAnalyzing) ? 'opacity-30 blur-sm' : 'opacity-100')}>
                {showUploadPrompt && (
                  <div className="text-center flex flex-col items-center justify-center h-full pointer-events-none">
                    <UploadCloud className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
                    <p className="mt-2 text-lg font-semibold text-foreground">Drag & drop screenshot here</p>
                    <p className="text-base text-muted-foreground">or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-3">PNG, JPG, GIF, WEBP supported</p>
                  </div>
                )}

                {showPreview && (
                  <div className="text-center relative w-full max-w-lg mx-auto group">
                     <Image
                        src={preview!}
                        alt={fileName || "Screenshot preview"}
                        width={500}
                        height={300}
                        className="rounded-lg object-contain mx-auto border-2 border-muted shadow-md max-h-[300px]"
                        data-ai-hint="chart screenshot"
                     />
                     <p className="text-sm text-muted-foreground mt-2 truncate px-4">{fileName}</p>
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1.5 right-1.5 h-8 w-8 text-muted-foreground bg-background/60 hover:bg-destructive/20 hover:text-destructive rounded-full opacity-50 group-hover:opacity-100 transition-all z-20"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearPreviewAndState();
                        }}
                        aria-label="Remove image"
                      >
                       <XCircle className="h-5 w-5" />
                     </Button>
                  </div>
                )}
            </div>

          </div>

           {showPreview && <SubmitButton />}
        </form>

        {analysisState.success && analysisState.isValidChart && analysisState.prediction && !isAnalysisPending && (
          <div className="mt-8 pt-6 border-t border-border/50 space-y-6 animate-in fade-in duration-500">
            <Card className="bg-card shadow-lg border border-border/30 rounded-lg overflow-hidden">
               <CardHeader className="pb-4 bg-muted/30 dark:bg-muted/10 border-b border-border/30">
                 <CardTitle className="text-xl font-semibold flex items-center gap-2 text-primary">
                    <Bot size={24} /> পরবর্তী ক্যান্ডেল পূর্বাভাস {/* Next Candle Forecast */}
                 </CardTitle>
               </CardHeader>
               <CardContent className="flex flex-col lg:flex-row items-stretch gap-6 p-6">
                 <div className={cn(
                     'flex flex-col items-center justify-center p-5 rounded-lg w-full lg:w-auto lg:min-w-[180px] text-center transition-all duration-300 border-2',
                     isPredictionUp ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700'
                    )}>
                   {isPredictionUp ? (
                     <TrendingUp className="h-16 w-16 text-green-600 dark:text-green-400 mb-2" />
                   ) : (
                     <TrendingDown className="h-16 w-16 text-red-600 dark:text-red-400 mb-2" />
                   )}
                   <p className={cn(
                      'text-5xl font-bold mb-1 tracking-tight',
                      isPredictionUp ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                    )}>
                     {analysisState.prediction.direction}
                   </p>
                   <p className="text-2xl font-medium text-muted-foreground">
                     ({probabilityPercentage}%)
                   </p>
                   <p className="text-sm font-semibold text-muted-foreground/80 mt-1 uppercase tracking-wider">Confidence</p>
                 </div>
                 <div className="w-full flex flex-col justify-center flex-1">
                    <h4 className="font-semibold text-base text-muted-foreground mb-2 ml-1">Annotated Chart:</h4>
                    {analysisState.annotatedImage ? (
                       <div className="relative aspect-video border border-muted rounded-md overflow-hidden shadow-inner bg-muted/20">
                           <Image
                             src={analysisState.annotatedImage}
                             alt="Annotated chart analysis"
                              fill
                             sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 600px"
                             className="object-contain"
                             data-ai-hint="annotated chart"
                           />
                       </div>
                    ): (
                         <div className="flex flex-col justify-center items-center text-center p-6 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-950/30 min-h-[200px] h-full aspect-video">
                             <AlertCircle className="h-10 w-10 text-blue-500 dark:text-blue-400 mb-3" />
                             <p className="font-semibold text-lg text-blue-800 dark:text-blue-300">Annotation Unavailable</p>
                             <p className="text-sm text-blue-700 dark:text-blue-400 mt-1 px-4">
                               The AI analysis is complete, but the annotated image could not be generated for this chart. The prediction is still valid.
                             </p>
                         </div>
                    )}
                 </div>
               </CardContent>
            </Card>

             {analysisState.disclaimer && (
                 <Alert variant="destructive" className="bg-orange-50 border-orange-300 dark:bg-orange-950/60 dark:border-orange-700/70 shadow-md rounded-lg">
                     <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                     <div className="ml-3 flex-1">
                         <AlertTitle className="font-bold text-base text-orange-800 dark:text-orange-200 mb-1">ঝুঁকি সতর্কতা (Risk Warning)</AlertTitle>
                         <AlertDescription className="text-orange-700/90 dark:text-orange-300/80 text-sm leading-relaxed">
                            {analysisState.disclaimer}
                         </AlertDescription>
                     </div>
                 </Alert>
             )}

            <div className="text-center mt-8">
                 <Button
                    variant="default"
                    size="lg"
                    asChild
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg transform hover:scale-105 transition-transform duration-200 text-base px-10 py-3 rounded-full font-semibold"
                 >
                   <a
                     href="https://t.me/QuotexAiHack"
                     target="_blank"
                     rel="noopener noreferrer"
                   >
                    <span>Join our Telegram <ExternalLink className="ml-2 h-5 w-5 inline-block" /></span>
                   </a>
                </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {history.length > 0 && (
        <Card className="w-full max-w-3xl mx-auto shadow-xl rounded-xl mt-8">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <History className="h-6 w-6 text-primary" />
                    <CardTitle>📋 Screenshot History</CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={handleClearHistory}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear History
                </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {history.map((item) => {
                    const probability = (item.prediction.probability * 100).toFixed(0);
                    const isUp = item.prediction.direction === 'UP';
                    return (
                        <div key={item.id} className="bg-muted/50 dark:bg-muted/20 p-4 rounded-lg shadow-sm border border-border/50 flex flex-wrap items-center justify-between gap-4">
                            <div className="font-bold text-lg text-primary">{item.id}</div>
                            <div className="text-sm text-muted-foreground">
                                {format(new Date(item.timestamp), "dd MMM yyyy - hh:mm a")}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn('font-semibold text-lg', isUp ? 'text-green-600' : 'text-red-600')}>
                                    {isUp ? <TrendingUp className="inline h-5 w-5 mr-1" /> : <TrendingDown className="inline h-5 w-5 mr-1" />}
                                    {item.prediction.direction}
                                </span>
                            </div>
                            <Badge variant={isUp ? 'default' : 'destructive'} className={cn('text-base', isUp ? 'bg-green-500' : 'bg-red-500')}>
                                {probability}%
                            </Badge>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    )}
    </>
  );
}
