'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { ZoomLevelControl } from '@/components/timeline/ZoomLevelControl';
import { useLanguage } from "@/components/LanguageProvider";

export default function EditPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [editedVideoUrl, setEditedVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [trimValues, setTrimValues] = useState([0, 0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 时间轴相关状态
  const [regions, setRegions] = useState<TimelineRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null); // 新增：激活的区域ID
  const [history, setHistory] = useState<TimelineRegion[][]>([]);
  const [redoStack, setRedoStack] = useState<TimelineRegion[][]>([]);
  const [timelineScale, setTimelineScale] = useState(1);

  // 播放控制状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLooping, setIsLooping] = useState(false); // 新增：循环播放状态

  // 导出设置状态
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [background, setBackground] = useState('none');
  const [customBackgroundFile, setCustomBackgroundFile] = useState<File | null>(null);

  // Zoom 设置状态
  const [isSettingZoomPosition, setIsSettingZoomPosition] = useState(false);
  const [pendingZoomRegion, setPendingZoomRegion] = useState<Partial<TimelineRegion> | null>(null);

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

  // 跳转并播放
  const handleSeekAndPlay = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);

    // 检查是否点击了 Zoom 区域
    const clickedRegion = regions.find(r =>
      r.type === 'zoom' && time >= r.start && time <= r.end
    );

    if (clickedRegion) {
      // 如果点击了 Zoom 区域，激活它并开始循环播放
      setActiveRegionId(clickedRegion.id);
      setSelectedRegionId(clickedRegion.id);
      setIsLooping(true);
      if (!isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    } else {
      // 如果点击了其他区域，取消激活状态，停止循环播放
      setActiveRegionId(null);
      setSelectedRegionId(null);
      setIsLooping(false);
      if (!isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // 放大级别调整
  const handleZoomLevelChange = (level: number) => {
    if (!activeRegionId) return;

    setRegions(regions.map(region =>
      region.id === activeRegionId
        ? { ...region, zoomLevel: level }
        : region
    ));
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

    // 检查是否在激活的 Zoom 区域内，如果是则循环播放
    if (activeRegionId && isLooping) {
      const activeRegion = regions.find(r => r.id === activeRegionId);
      if (activeRegion && activeRegion.type === 'zoom') {
        if (time >= activeRegion.end) {
          // 循环播放：跳回开始位置
          videoRef.current.currentTime = activeRegion.start;
          setCurrentTime(activeRegion.start);
        }
        return; // 在激活区域内，不处理其他逻辑
      }
    }

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
    // 如果有激活的 Zoom 区域，优先使用激活的
    if (activeRegionId) {
      const activeRegion = regions.find(r => r.id === activeRegionId);
      if (activeRegion && activeRegion.type === 'zoom') {
        return activeRegion;
      }
    }

    // 否则查找当前时间所在的 Zoom 区域
    return regions.find(r =>
      r.type === 'zoom' && currentTime >= r.start && currentTime <= r.end
    );
  };

  const currentZoomRegion = getCurrentZoomRegion();

  const useVideoZoomOptimized = () => {
    const [zoomStyle, setZoomStyle] = useState({});
    const lastZoomCenterRef = useRef({ x: 50, y: 50 });

    useEffect(() => {
      const baseStyle = {
        willChange: 'transform',
        backfaceVisibility: 'hidden',
      };

      if (currentZoomRegion) {
        // 更新缩放中心点
        lastZoomCenterRef.current = {
          x: currentZoomRegion.zoomCenter?.x || 50,
          y: currentZoomRegion.zoomCenter?.y || 50
        };

        setZoomStyle({
          ...baseStyle,
          transform: `scale(${currentZoomRegion.zoomLevel || 1.5})`,
          transformOrigin: `${lastZoomCenterRef.current.x}% ${lastZoomCenterRef.current.y}%`,
          transition: 'transform 0.78s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        });
      } else {
        // 缩小时保持相同的缩放中心，避免跳跃
        setZoomStyle({
          ...baseStyle,
          transform: 'scale(1)',
          transformOrigin: `${lastZoomCenterRef.current.x}% ${lastZoomCenterRef.current.y}%`,
          transition: 'transform 0.63s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        });
      }
    }, [currentZoomRegion]);

    return zoomStyle;
  };

  const videoStyle = useVideoZoomOptimized();


  // 视频播放状态变化处理
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  // 视频点击事件处理
  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    console.log('Video clicked!', { isSettingZoomPosition, pendingZoomRegion });

    if (!isSettingZoomPosition || !pendingZoomRegion) {
      console.log('Not in zoom setting mode or no pending region');
      return;
    }

    const videoElement = e.currentTarget;
    const rect = videoElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    console.log('Click coordinates:', { x, y, clientX: e.clientX, clientY: e.clientY, rect });

    // 创建完整的 Zoom 区域
    const newRegion: TimelineRegion = {
      ...pendingZoomRegion,
      zoomCenter: { x, y },
      zoomLevel: 1.5, // 默认放大级别
    } as TimelineRegion;

    // 添加到区域列表
    setHistory(h => [...h, regions]);
    setRegions([...regions, newRegion]);
    setSelectedRegionId(newRegion.id);
    // 新增的 zoom 区域自动激活
    setActiveRegionId(newRegion.id);
    setIsLooping(true);
    setRedoStack([]);

    // 退出设置模式
    setIsSettingZoomPosition(false);
    setPendingZoomRegion(null);

    // 显示成功提示
    toast({
      title: t('zoomRegionAdded'),
      description: t('zoomRegionAddedDesc', { x: Math.round(x), y: Math.round(y) }),
    });
  };

  // 取消设置 Zoom 位置
  const handleCancelZoomPosition = () => {
    setIsSettingZoomPosition(false);
    setPendingZoomRegion(null);
    toast({
      title: t('cancelled'),
      description: t('zoomPositionCancelled'),
    });
  };

  // 重置激活状态
  const resetActiveState = () => {
    setActiveRegionId(null);
    setIsLooping(false);
  };

  // 工具栏操作
  const handleAddZoom = () => {
    if (!duration) return;
    const len = duration / 50; // 区间长度为视频总长的1/50
    const start = currentTime; // 开始时间就是当前暂停的时间
    const end = Math.min(duration, start + len);

    console.log('Adding zoom region:', { start, end, currentTime, duration, len });

    // 暂停视频播放
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    // 进入设置 Zoom 位置模式
    setIsSettingZoomPosition(true);
    setPendingZoomRegion({
      id: `zoom-${Date.now()}`,
      type: 'zoom',
      start,
      end,
      zoomSize: { width: 200, height: 200 }, // 固定大小 200x200
    });

    console.log('Set zoom position mode:', {
      isSettingZoomPosition: true, pendingZoomRegion: {
        id: `zoom-${Date.now()}`,
        type: 'zoom',
        start,
        end,
        zoomSize: { width: 200, height: 200 },
      }
    });

    // 显示提示
    toast({
      title: t('setZoomPosition'),
      description: t('setZoomPositionDesc'),
    });
  };
  const handleAddTrim = () => {
    if (!duration) return;
    const len = duration / 50; // 区间长度为视频总长的1/50
    const start = currentTime; // 开始时间就是当前时间
    const end = Math.min(duration, start + len);
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
    // 如果删除的是激活的区域，重置激活状态
    if (selectedRegionId === activeRegionId) {
      resetActiveState();
    }
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
    resetActiveState();
    setRedoStack([]);
  };

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return;
    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      console.log(message);
    });
    ffmpeg.on('progress', ({ progress, time }) => {
      // 只在导出过程中更新进度，避免与手动设置的进度冲突
      if (isProcessing) {
        setProgress(Math.round(progress * 100));
      }
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
        const videoId = params.id as string;
        if (!videoId) {
          toast({
            title: t('paramError'),
            description: t('missingVideoId'),
            variant: 'destructive',
          });
          router.push('/recordings');
          return;
        }

        const videoBlob = await getVideoFromDB(videoId);
        if (!videoBlob) {
          toast({
            title: t('videoNotFound'),
            description: t('cannotFindVideo'),
            variant: 'destructive',
          });
          router.push('/recordings');
          return;
        }

        const url = URL.createObjectURL(videoBlob);
        setVideoUrl(url);

        toast({
          title: t('videoLoaded'),
          description: t('videoLoadedDesc'),
        });
      } catch (error) {
        console.error('Failed to load video:', error);
        toast({
          title: t('loadFailed'),
          description: t('cannotLoadVideo'),
          variant: 'destructive',
        });
        router.push('/recordings');
      }
    };

    loadVideo();
    loadFFmpeg();
  }, [params.id, router, toast]);

  // 自动同步 localStorage 的 autoZoomRegions 到 regions
  useEffect(() => {
    const autoZoomRaw = localStorage.getItem('autoZoomRegions');
    if (autoZoomRaw) {
      try {
        const autoZooms = JSON.parse(autoZoomRaw);
        if (Array.isArray(autoZooms) && autoZooms.length > 0) {
          setRegions(prev => {
            // 避免重复添加
            const prevIds = new Set(prev.map(r => r.id));
            const filtered = autoZooms.filter((z: any) => !prevIds.has(z.id));
            return [...prev, ...filtered];
          });
        }
      } catch { }
      // 只用一次后清理，避免下次重复
      localStorage.removeItem('autoZoomRegions');
    }
  }, []);

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
      // 自动播放
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      }
    }
  };



  const handleTrim = async () => {
    if (!ffmpegRef.current || !videoUrl || !ffmpegRef.current.loaded) {
      toast({ title: t('ffmpegNotLoaded'), variant: 'destructive' });
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
    toast({ title: t('trimmingComplete'), description: t('trimmingCompleteDesc') });
  };

  // 导出功能 - Canvas 逐帧渲染与录制
  const handleExport = async () => {
    if (!videoRef.current || !videoUrl) {
      toast({ title: t('videoNotLoaded'), variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    // 1. 创建/获取 canvas
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }
    
    // 提升分辨率为 1080p（可根据 aspectRatio 动态调整）
    let width = 1920, height = 1080;
    switch (aspectRatio) {
      case '16:9': width = 1920; height = 1080; break;
      case '4:3': width = 1440; height = 1080; break;
      case '1:1': width = 1080; height = 1080; break;
      case '9:16': width = 1080; height = 1920; break;
      default: width = 1920; height = 1080;
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast({ title: t('canvasInitializationFailed'), variant: 'destructive' });
      setIsProcessing(false);
      return;
    }

    // 获取原视频帧率，但限制在合理范围内
    let videoFrameRate = 30;
    try {
      // @ts-ignore
      const stream = videoRef.current?.captureStream?.();
      if (stream && stream.getVideoTracks && stream.getVideoTracks().length > 0) {
        const settings = stream.getVideoTracks()[0].getSettings();
        if (settings && settings.frameRate) {
          videoFrameRate = Math.min(60, Math.max(24, Math.round(settings.frameRate)));
        }
      }
    } catch (e) { }
    
    // fallback: 用 duration/totalFrames 估算
    if (!videoFrameRate && duration && videoRef.current?.videoWidth) {
      videoFrameRate = Math.round((videoRef.current as any).getVideoPlaybackQuality?.().totalVideoFrames / duration) || 30;
    }
    if (!videoFrameRate) videoFrameRate = 30;

    // 预处理背景图片（如有）
    let bgImage: HTMLImageElement | null = null;
    if (background && background !== 'none' && background !== 'black' && background !== 'white') {
      let bgUrl = '';
      if (background.startsWith('tech-') || background.startsWith('cyber-') || background.startsWith('neon-') || background.startsWith('matrix-') || background.startsWith('futuristic-')) {
        const presetBackgrounds = {
          'tech-blue': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&h=1080&fit=crop',
          'cyber-grid': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop',
          'neon-purple': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1920&h=1080&fit=crop',
          'matrix-green': 'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=1920&h=1080&fit=crop',
          'futuristic-orange': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop'
        };
        bgUrl = presetBackgrounds[background as keyof typeof presetBackgrounds] || '';
      } else if (customBackgroundFile) {
        bgUrl = URL.createObjectURL(customBackgroundFile);
      }
      if (bgUrl) {
        bgImage = new window.Image();
        bgImage.src = bgUrl;
        await new Promise<void>(resolve => {
          bgImage!.onload = () => resolve();
          bgImage!.onerror = () => resolve();
        });
      }
    }

    // 处理 trim 区域
    const trimRegions = regions.filter(r => r.type === 'trim');
    trimRegions.sort((a, b) => a.start - b.start);

    // 生成所有导出帧的时间戳（trim 区域外的每一帧）
    const video = videoRef.current;
    let frameTimes: number[] = [];
    let t = 0;
    const frameInterval = 1 / videoFrameRate;
    
    while (t < duration) {
      // 跳过 trim 区域
      const inTrim = trimRegions.some(region => t >= region.start && t < region.end);
      if (!inTrim) frameTimes.push(t);
      t += frameInterval;
    }
    const totalFrames = frameTimes.length;

    // 设置 MediaRecorder
    let stopped = false;
    let recordedChunks: Blob[] = [];
    const streamOut = canvas.captureStream(videoFrameRate);
    const recorder = new MediaRecorder(streamOut, { 
      mimeType: 'video/webm;codecs=vp9', // 使用更高效的编码
      videoBitsPerSecond: 8000000 // 设置合适的比特率
    });
    
    recorder.ondataavailable = e => { 
      if (e.data.size > 0) recordedChunks.push(e.data); 
    };
    
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exported-video-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setProgress(100);
      setIsProcessing(false);
      toast({ title: t('exportComplete'), description: t('exportCompleteDesc') });
    };

    // 优化：预先缓存 zoom 区域信息
    const zoomRegions = regions.filter(r => r.type === 'zoom');
    const zoomMap = new Map();
    zoomRegions.forEach(region => {
      for (let i = 0; i < frameTimes.length; i++) {
        const time = frameTimes[i];
        if (time >= region.start && time < region.end) {
          zoomMap.set(i, region);
        }
      }
    });

    // 优化：创建统一的 seeked 事件处理器
    let currentResolve: (() => void) | null = null;
    const onSeeked = () => {
      if (currentResolve) {
        currentResolve();
        currentResolve = null;
      }
    };
    video.addEventListener('seeked', onSeeked);

    // 优化：批量处理和异步队列
    let exportIndex = 0;
    const batchSize = 3; // 每批处理的帧数
    const frameBatch: number[] = [];
    
    const drawFrame = async () => {
      if (!videoRef.current || stopped) return;
      
      if (exportIndex >= totalFrames) {
        stopped = true;
        video.removeEventListener('seeked', onSeeked);
        recorder.stop();
        return;
      }

      const time = frameTimes[exportIndex];
      
      // 使用更精确的 currentTime 设置
      if (Math.abs(video.currentTime - time) > 0.1) {
        video.currentTime = time;
        await new Promise<void>(resolve => {
          currentResolve = resolve;
          // 添加超时保护
          setTimeout(() => {
            if (currentResolve === resolve) {
              currentResolve = null;
              resolve();
            }
          }, 100);
        });
      }

      // 绘制背景（优化：避免重复绘制相同背景）
      if (background === 'black') {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
      } else if (background === 'white') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
      } else if (bgImage) {
        ctx.drawImage(bgImage, 0, 0, width, height);
      } else {
        ctx.clearRect(0, 0, width, height);
      }

      // zoom 效果（优化：使用预缓存的 zoom 信息）
      const zoomRegion = zoomMap.get(exportIndex);
      if (zoomRegion && zoomRegion.zoomCenter) {
        const zoomLevel = zoomRegion.zoomLevel || 1.5;
        const cx = (zoomRegion.zoomCenter.x / 100) * video.videoWidth;
        const cy = (zoomRegion.zoomCenter.y / 100) * video.videoHeight;
        const sw = video.videoWidth / zoomLevel;
        const sh = video.videoHeight / zoomLevel;
        const sx = Math.max(0, Math.min(cx - sw / 2, video.videoWidth - sw));
        const sy = Math.max(0, Math.min(cy - sh / 2, video.videoHeight - sh));
        
        ctx.drawImage(
          video,
          sx, sy, sw, sh,
          0, 0, width, height
        );
      } else {
        ctx.drawImage(video, 0, 0, width, height);
      }

      // 更新进度
      setProgress(Math.round((exportIndex / totalFrames) * 90));
      exportIndex++;

      // 使用 setTimeout 代替 requestAnimationFrame 来控制帧率
      setTimeout(drawFrame, 1000 / videoFrameRate);
    };

    // 启动录制和绘制
    recorder.start();
    drawFrame();
  };


  return (
    <main className="container mx-auto px-2 py-4">
      <Card className="border-0 shadow-none">
        <CardContent className="grid md:grid-cols-5 gap-4 p-4">
          <div className="md:col-span-4">
            <div className="overflow-hidden rounded-lg">
              <div className="relative">
                <video
                  ref={videoRef}
                  src={editedVideoUrl || videoUrl || undefined}
                  controls
                  loop
                  muted
                  className={`w-full aspect-video rounded-lg bg-transparent ${isSettingZoomPosition ? 'cursor-crosshair' : ''
                    }`}
                  style={videoStyle}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onClick={handleVideoClick}
                />
                {isSettingZoomPosition && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg pointer-events-none">
                    <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
                      点击视频设置放大中心点
                    </div>
                  </div>
                )}
              </div>
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
              onCancelZoomPosition={handleCancelZoomPosition}
              isPlaying={isPlaying}
              selectedId={selectedRegionId}
              isSettingZoomPosition={isSettingZoomPosition}
              timelineScale={timelineScale}
              onTimelineScaleChange={setTimelineScale}
            />
            <TimelineEditor
              duration={duration}
              regions={regions.map(r => ({
                ...r,
                selected: r.id === selectedRegionId,
                active: r.id === activeRegionId
              }))}
              selectedId={selectedRegionId}
              currentTime={currentTime}
              onSelect={setSelectedRegionId}
              onChange={setRegions}
              onTimeChange={handleTimeChange}
              onSeekAndPlay={handleSeekAndPlay}
              timelineScale={timelineScale}
            />
          </div>
          <div className="md:col-span-1 space-y-4">
            <ExportPanel
              onExport={handleExport}
              isProcessing={isProcessing}
              progress={progress}
              aspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
              background={background}
              onBackgroundChange={setBackground}
              onBackgroundUpload={handleBackgroundUpload}
            />
            <ZoomLevelControl
              zoomLevel={regions.find(r => r.id === activeRegionId)?.zoomLevel || 1.5}
              onZoomLevelChange={handleZoomLevelChange}
              isVisible={!!activeRegionId}
            />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
