'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Download, Scissors, Crop } from 'lucide-react';
import { getVideoFromDB, clearDB } from '@/lib/db';

export default function EditPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [editedVideoUrl, setEditedVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [trimValues, setTrimValues] = useState([0, 0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return;
    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      console.log(message);
    });
    ffmpeg.on('progress', ({ progress, time }) => {
      setProgress(Math.round(progress * 100));
    });
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegRef.current = ffmpeg;
  };

  useEffect(() => {
    const loadVideo = async () => {
      try {
        const videoBlob = await getVideoFromDB();
        if (videoBlob) {
          const url = URL.createObjectURL(videoBlob);
          setVideoUrl(url);
          loadFFmpeg();
        } else {
          toast({
            title: 'No Video Found',
            description: 'No recorded video to edit. Redirecting to home.',
            variant: 'destructive',
          });
          router.push('/');
        }
      } catch (error) {
        console.error("Failed to load video from DB:", error);
        toast({
          title: 'Error Loading Video',
          description: 'Could not load the video from the database.',
          variant: 'destructive',
        });
        router.push('/');
      }
    };
    
    loadVideo();

    // return () => {
    //   // Clean up the DB when the user navigates away
    //   clearDB().catch(err => console.error("Failed to clear DB", err));
    // };
  }, [router, toast]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setTrimValues([0, videoDuration]);
    }
  };
  
  const handleTrim = async () => {
    if (!ffmpegRef.current || !videoUrl || !ffmpegRef.current.loaded) {
      toast({ title: 'FFmpeg not loaded', variant: 'destructive' });
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    setEditedVideoUrl(null);
    
    const ffmpeg = ffmpegRef.current;
    const inputFileName = 'input.webm';
    const outputFileName = 'output.mp4';
    
    await ffmpeg.writeFile(inputFileName, await fetchFile(videoUrl));

    const [startTime, endTime] = trimValues;
    const trimDuration = endTime - startTime;

    await ffmpeg.exec([
        '-i', inputFileName,
        '-ss', startTime.toString(),
        '-t', trimDuration.toString(),
        '-c', 'copy',
        outputFileName
    ]);

    const data = await ffmpeg.readFile(outputFileName);
    const blob = new Blob([data], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    setEditedVideoUrl(url);
    setIsProcessing(false);
    toast({ title: 'Trimming complete!', description: 'Your video has been trimmed.' });
  };


  return (
    <main className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Video Editor</CardTitle>
          <CardDescription>Trim or crop your recording before downloading.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <video
              ref={videoRef}
              src={editedVideoUrl || videoUrl}
              controls
              className="w-full aspect-video rounded-lg bg-muted"
              onLoadedMetadata={handleLoadedMetadata}
            />
          </div>
          <div className="space-y-6">
            <div className="space-y-4">
              <Label htmlFor="trim">Trim Video</Label>
              <Slider
                id="trim"
                min={0}
                max={duration}
                step={0.1}
                value={trimValues}
                onValueChange={setTrimValues}
                className="w-full"
                disabled={isProcessing}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Start: {trimValues[0].toFixed(1)}s</span>
                <span>End: {trimValues[1].toFixed(1)}s</span>
              </div>
               <Button onClick={handleTrim} disabled={isProcessing} className="w-full">
                <Scissors className="mr-2 h-4 w-4" />
                {isProcessing ? 'Trimming...' : 'Apply Trim'}
              </Button>
            </div>
            
            <div className="space-y-4">
               <Label>Crop Video</Label>
               <Button variant="outline" disabled className="w-full">
                <Crop className="mr-2 h-4 w-4" />
                Crop (Coming Soon)
               </Button>
            </div>
            
            {isProcessing && (
              <div className="space-y-2">
                <Label>Processing...</Label>
                <Progress value={progress} />
              </div>
            )}

            {editedVideoUrl && (
              <div className="space-y-2">
                <Label>Download Edited Video</Label>
                <a href={editedVideoUrl} download={`edited-recording-${Date.now()}.mp4`}>
                    <Button className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                    </Button>
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
