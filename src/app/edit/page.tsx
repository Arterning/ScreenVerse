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
import { TimelineEditor, TimelineRegion } from '@/components/timeline/TimelineEditor';
import { TimelineToolbar } from '@/components/timeline/TimelineToolbar';
import { ExportPanel } from '@/components/timeline/ExportPanel';

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

  // 时间轴相关状态
  const [regions, setRegions] = useState<TimelineRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [history, setHistory] = useState<TimelineRegion[][]>([]);
  const [redoStack, setRedoStack] = useState<TimelineRegion[][]>([]);
  
  // 播放控制状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // 导出设置状态
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [background, setBackground] = useState('none');
  const [customBackgroundFile, setCustomBackgroundFile] = useState<File | null>(null);

  // 背景上传处理
  const handleBackgroundUpload = (file: File) => {
    setCustomBackgroundFile(file);
  };

  // 播放控制
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeChange = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // 视频时间更新处理
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    
    // 检查是否在 Trim 区域内，如果是则跳过
    const currentTrimRegion = regions.find(r => 
      r.type === 'trim' && time >= r.start && time <= r.end
    );
    
    if (currentTrimRegion) {
      // 跳到 Trim 区域结束位置
      videoRef.current.currentTime = currentTrimRegion.end;
      setCurrentTime(currentTrimRegion.end);
    }
  };

  // 获取当前 Zoom 区域
  const getCurrentZoomRegion = () => {
    return regions.find(r => 
      r.type === 'zoom' && currentTime >= r.start && currentTime <= r.end
    );
  };

  const currentZoomRegion = getCurrentZoomRegion();
  const videoContainerStyle = currentZoomRegion ? {
    transform: 'scale(1.5)',
    transformOrigin: 'center center',
    transition: 'transform 0.3s ease-in-out',
  } : {
    transform: 'scale(1)',
    transition: 'transform 0.3s ease-in-out',
  };

  // 视频播放状态变化处理
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  // 工具栏操作
  const handleAddZoom = () => {
    if (!duration) return;
    const len = duration / 10;
    const start = 0;
    const end = Math.min(len, duration);
    const newRegion: TimelineRegion = {
      id: `zoom-${Date.now()}`,
      type: 'zoom',
      start,
      end,
    };
    setHistory(h => [...h, regions]);
    setRegions([...regions, newRegion]);
    setSelectedRegionId(newRegion.id);
    setRedoStack([]);
  };
  const handleAddTrim = () => {
    if (!duration) return;
    const len = duration / 10;
    const start = 0;
    const end = Math.min(len, duration);
    const newRegion: TimelineRegion = {
      id: `trim-${Date.now()}`,
      type: 'trim',
      start,
      end,
    };
    setHistory(h => [...h, regions]);
    setRegions([...regions, newRegion]);
    setSelectedRegionId(newRegion.id);
    setRedoStack([]);
  };
  const handleDelete = () => {
    if (!selectedRegionId) return;
    setHistory(h => [...h, regions]);
    setRegions(regions.filter(r => r.id !== selectedRegionId));
    setSelectedRegionId(null);
    setRedoStack([]);
  };
  const handleUndo = () => {
    if (history.length === 0) return;
    setRedoStack(r => [regions, ...r]);
    const prev = history[history.length - 1];
    setRegions(prev);
    setHistory(history.slice(0, -1));
    setSelectedRegionId(null);
  };
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    setHistory(h => [...h, regions]);
    const next = redoStack[0];
    setRegions(next);
    setRedoStack(redoStack.slice(1));
    setSelectedRegionId(null);
  };
  const handleReset = () => {
    setHistory(h => [...h, regions]);
    setRegions([]);
    setSelectedRegionId(null);
    setRedoStack([]);
  };

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
  const video = videoRef.current;
  if (video) {
    // 如果 duration 是 Infinity，尝试 seekToEnd 再 seek 回 0
    if (!isFinite(video.duration)) {
      video.currentTime = 1e10;
      video.ontimeupdate = () => {
        video.ontimeupdate = null;
        const actualDuration = video.duration;
        if (isFinite(actualDuration)) {
          setDuration(actualDuration);
          setTrimValues([0, actualDuration]);
          video.currentTime = 0;
        }
      };
    } else {
      const actualDuration = video.duration;
      setDuration(actualDuration);
      setTrimValues([0, actualDuration]);
    }
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
      '-ss', startTime.toString(),
      '-i', inputFileName,
      '-t', trimDuration.toString(),
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-movflags', 'faststart',
      outputFileName
    ]);
    

    const data = await ffmpeg.readFile(outputFileName);
    const blob = new Blob([data], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    setEditedVideoUrl(url);
    setIsProcessing(false);
    toast({ title: 'Trimming complete!', description: 'Your video has been trimmed.' });
  };

  // 导出功能 - 应用 Zoom 和 Trim 效果
  const handleExport = async () => {
    if (!ffmpegRef.current || !videoUrl || !ffmpegRef.current.loaded) {
      toast({ title: 'FFmpeg not loaded', variant: 'destructive' });
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    
    const ffmpeg = ffmpegRef.current;
    const inputFileName = 'input.webm';
    const outputFileName = 'exported.mp4';
    
    await ffmpeg.writeFile(inputFileName, await fetchFile(videoUrl));

    // 构建 FFmpeg 命令
    const zoomRegions = regions.filter(r => r.type === 'zoom');
    const trimRegions = regions.filter(r => r.type === 'trim');
    
    let ffmpegArgs = ['-i', inputFileName];
    
    // 处理 Trim 区域 - 构建分段
    let segments = [];
    if (trimRegions.length > 0) {
      // 按时间排序
      trimRegions.sort((a, b) => a.start - b.start);
      
      // 构建分段列表（排除 Trim 区域）
      let lastEnd = 0;
      for (const trim of trimRegions) {
        if (trim.start > lastEnd) {
          segments.push({ start: lastEnd, end: trim.start });
        }
        lastEnd = trim.end;
      }
      
      if (lastEnd < duration) {
        segments.push({ start: lastEnd, end: duration });
      }
    } else {
      // 没有 Trim 区域，整个视频作为一个分段
      segments = [{ start: 0, end: duration }];
    }
    
    // 处理 Aspect ratio
    let scaleFilter = '';
    switch (aspectRatio) {
      case '16:9':
        scaleFilter = 'scale=1920:1080';
        break;
      case '4:3':
        scaleFilter = 'scale=1440:1080';
        break;
      case '1:1':
        scaleFilter = 'scale=1080:1080';
        break;
      case '9:16':
        scaleFilter = 'scale=1080:1920';
        break;
      default:
        scaleFilter = 'scale=1920:1080';
    }
    
    // 处理背景
    let backgroundFilter = '';
    if (background === 'black') {
      backgroundFilter = 'pad=iw:ih:0:0:black';
    } else if (background === 'white') {
      backgroundFilter = 'pad=iw:ih:0:0:white';
    }
    
    // 构建复杂的滤镜链
    let filterChain = scaleFilter;
    if (backgroundFilter) {
      filterChain += `,${backgroundFilter}`;
    }
    
    // 如果有 Zoom 区域，添加 Zoom 效果
    if (zoomRegions.length > 0) {
      // 简化的 Zoom 效果 - 在指定时间段内放大
      filterChain += ',zoompan=z=\'if(lte(on,1),1.5,1)\':d=1:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)';
    }
    
    if (filterChain) {
      ffmpegArgs.push('-vf', filterChain);
    }
    
    // 如果有多个分段，需要合并
    if (segments.length > 1) {
      // 创建分段文件
      const segmentFiles = [];
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const segmentFileName = `segment_${i}.mp4`;
        
        await ffmpeg.exec([
          '-ss', segment.start.toString(),
          '-i', inputFileName,
          '-t', (segment.end - segment.start).toString(),
          '-c:v', 'libx264',
          '-c:a', 'aac',
          segmentFileName
        ]);
        
        segmentFiles.push(segmentFileName);
      }
      
      // 创建文件列表
      const fileList = segmentFiles.map(f => `file '${f}'`).join('\n');
      await ffmpeg.writeFile('filelist.txt', fileList);
      
      // 合并分段
      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'filelist.txt',
        '-c', 'copy',
        outputFileName
      ]);
    } else {
      // 单个分段，直接处理
      await ffmpeg.exec([
        ...ffmpegArgs,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-movflags', 'faststart',
        outputFileName
      ]);
    }
    
    try {
      const data = await ffmpeg.readFile(outputFileName);
      const blob = new Blob([data], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      
      // 创建下载链接
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setIsProcessing(false);
      toast({ title: 'Export complete!', description: 'Your video has been exported with all effects applied.' });
    } catch (error) {
      console.error('Export error:', error);
      setIsProcessing(false);
      toast({ title: 'Export failed', description: 'Failed to export video.', variant: 'destructive' });
    }
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
            <div className="overflow-hidden rounded-lg" style={videoContainerStyle}>
              <video
                ref={videoRef}
                src={editedVideoUrl || videoUrl || undefined}
                controls
                className="w-full aspect-video rounded-lg bg-muted"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onPlay={handlePlay}
                onPause={handlePause}
              />
            </div>
            {/* 时间轴和工具栏 */}
            <TimelineToolbar
              onAddZoom={handleAddZoom}
              onAddTrim={handleAddTrim}
              onDelete={handleDelete}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onReset={handleReset}
              onPlayPause={handlePlayPause}
              isPlaying={isPlaying}
              selectedId={selectedRegionId}
            />
            <TimelineEditor
              duration={duration}
              regions={regions.map(r => ({ ...r, selected: r.id === selectedRegionId }))}
              selectedId={selectedRegionId}
              currentTime={currentTime}
              onSelect={setSelectedRegionId}
              onChange={setRegions}
              onTimeChange={handleTimeChange}
            />
          </div>
          <div className="space-y-6">
            <ExportPanel
              onExport={handleExport}
              isProcessing={isProcessing}
              aspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
              background={background}
              onBackgroundChange={setBackground}
              onBackgroundUpload={handleBackgroundUpload}
            />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
