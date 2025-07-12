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
import { ZoomLevelControl } from '@/components/timeline/ZoomLevelControl';

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
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null); // 新增：激活的区域ID
  const [history, setHistory] = useState<TimelineRegion[][]>([]);
  const [redoStack, setRedoStack] = useState<TimelineRegion[][]>([]);
  
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
  const videoStyle = currentZoomRegion ? {
    transform: `scale(${currentZoomRegion.zoomLevel || 1.5})`,
    transformOrigin: `${currentZoomRegion.zoomCenter?.x || 50}% ${currentZoomRegion.zoomCenter?.y || 50}%`,
    transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  } : {
    transform: 'scale(1)',
    transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  };

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
      title: '放大区域已添加',
      description: `放大中心点设置在 (${Math.round(x)}%, ${Math.round(y)}%)，可以继续播放视频查看效果`,
    });
  };
  
  // 取消设置 Zoom 位置
  const handleCancelZoomPosition = () => {
    setIsSettingZoomPosition(false);
    setPendingZoomRegion(null);
    toast({
      title: '已取消',
      description: '放大位置设置已取消，可以继续播放视频',
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
    
    console.log('Set zoom position mode:', { isSettingZoomPosition: true, pendingZoomRegion: {
      id: `zoom-${Date.now()}`,
      type: 'zoom',
      start,
      end,
      zoomSize: { width: 200, height: 200 },
    }});
    
    // 显示提示
    toast({
      title: '设置放大位置',
      description: '视频已暂停，点击视频上的任意位置来设置放大中心点',
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
    
    try {
      await ffmpeg.writeFile(inputFileName, await fetchFile(videoUrl));
      setProgress(10);

      // 构建 FFmpeg 命令
      const zoomRegions = regions.filter(r => r.type === 'zoom');
      const trimRegions = regions.filter(r => r.type === 'trim');
      
      // 处理 Trim 区域 - 构建分段
      let segments = [];
      if (trimRegions.length > 0) {
        // 按时间排序
        trimRegions.sort((a, b) => a.start - b.start);
        
        // 构建分段列表（保留非 Trim 区域）
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
        
        // 如果没有有效分段，使用整个视频
        if (segments.length === 0) {
          segments = [{ start: 0, end: duration }];
        }
      } else {
        // 没有 Trim 区域，整个视频作为一个分段
        segments = [{ start: 0, end: duration }];
      }
      
      // 调试信息
      console.log('Trim regions:', trimRegions);
      console.log('Segments:', segments);
      console.log('Zoom regions:', zoomRegions);
      
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
      let hasBackground = false;
      let backgroundFilter = '';
      
      if (background === 'black') {
        backgroundFilter = 'pad=iw:ih:0:0:black';
      } else if (background === 'white') {
        backgroundFilter = 'pad=iw:ih:0:0:white';
      } else if (background.startsWith('tech-') || background.startsWith('cyber-') || background.startsWith('neon-') || background.startsWith('matrix-') || background.startsWith('futuristic-')) {
        // 预置背景图片处理
        const presetBackgrounds = {
          'tech-blue': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop',
          'cyber-grid': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop',
          'neon-purple': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=600&fit=crop',
          'matrix-green': 'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=800&h=600&fit=crop',
          'futuristic-orange': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop'
        };
        
        const bgUrl = presetBackgrounds[background as keyof typeof presetBackgrounds];
        if (bgUrl) {
          try {
            const bgResponse = await fetch(bgUrl);
            const bgBlob = await bgResponse.blob();
            const bgBuffer = await bgBlob.arrayBuffer();
            await ffmpeg.writeFile('background.jpg', new Uint8Array(bgBuffer));
            hasBackground = true;
            setProgress(20);
            console.log('Background image loaded successfully');
          } catch (error) {
            console.error('Failed to load background image:', error);
            // 如果背景图片加载失败，继续处理但不使用背景
            hasBackground = false;
          }
        }
      }
      
      console.log('Background setting:', background);
      console.log('Has background:', hasBackground);
      
      // 构建滤镜链 - 修复 Zoom 和背景处理
      let filterChain = '';
      let useComplexFilter = false;
      
      // 构建 Zoom 效果滤镜 - 支持多个 Zoom 区间
      let zoomFilter = '';
      if (zoomRegions.length > 0) {
        // 使用 split+scale+crop+overlay 方案支持多个 Zoom 区间
        const scaleExpr = 1.5; // 放大倍数
        
        if (zoomRegions.length === 1) {
          // 单个 Zoom 区域的简化版本
          const zoom = zoomRegions[0];
          const startTime = Math.round(zoom.start * 100) / 100;
          const endTime = Math.round(zoom.end * 100) / 100;
          
          zoomFilter = `[0:v]split=2[base][zoomed];` +
            `[zoomed]scale=iw*${scaleExpr}:ih*${scaleExpr},crop=iw:ih:(in_w-out_w)/2:(in_h-out_h)/2[zoomedout];` +
            `[base][zoomedout]overlay=shortest=1:enable='between(t,${startTime},${endTime})'`;
        } else {
          // 多个 Zoom 区域的完整版本
          let filterParts = [`[0:v]split=${zoomRegions.length + 1}[base]`];
          
          // 为每个 Zoom 区域创建处理链
          zoomRegions.forEach((zoom, index) => {
            const startTime = Math.round(zoom.start * 100) / 100;
            const endTime = Math.round(zoom.end * 100) / 100;
            const zoomIndex = index + 1;
            
            // 添加缩放和裁剪
            filterParts.push(`[base]scale=iw*${scaleExpr}:ih*${scaleExpr},crop=iw:ih:(in_w-out_w)/2:(in_h-out_h)/2[zoom${zoomIndex}]`);
          });
          
          // 构建 overlay 链
          let overlayChain = '[base]';
          zoomRegions.forEach((zoom, index) => {
            const startTime = Math.round(zoom.start * 100) / 100;
            const endTime = Math.round(zoom.end * 100) / 100;
            const zoomIndex = index + 1;
            
            overlayChain += `[zoom${zoomIndex}]overlay=shortest=1:enable='between(t,${startTime},${endTime})'`;
            if (index < zoomRegions.length - 1) {
              overlayChain += '[tmp' + (index + 1) + '];[tmp' + (index + 1) + ']';
            }
          });
          
          filterParts.push(overlayChain);
          zoomFilter = filterParts.join(';');
        }
        
        console.log('Zoom filter chain:', zoomFilter);
      }
      
      // 构建滤镜链 - 支持 Zoom 效果
      if (zoomRegions.length > 0) {
        // 有 Zoom 效果时使用复杂滤镜
        useComplexFilter = true;
        filterChain = zoomFilter;
        console.log('Complex filter chain (with zoom):', filterChain);
      } else {
        // 没有 Zoom 效果时的简单处理
        filterChain = scaleFilter;
        if (backgroundFilter) {
          filterChain += `,${backgroundFilter}`;
        }
        console.log('Simple filter chain:', filterChain);
      }
      
      setProgress(30);
      
      // 修复 Trim 逻辑 - 分别处理每个 segment，添加内存优化
      if (segments.length > 1) {
        // 多个分段，需要分别处理然后合并
        const segmentFiles = [];
        const totalSegments = segments.length;
        
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          const segmentFileName = `segment_${i}.mp4`;
          
          const segmentArgs = [
            '-ss', segment.start.toString(),
            '-i', inputFileName,
            '-t', (segment.end - segment.start).toString(),
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '128k',
            segmentFileName
          ];
          
          if (filterChain) {
            if (useComplexFilter) {
              segmentArgs.push('-filter_complex', filterChain);
            } else {
              segmentArgs.push('-vf', filterChain);
            }
          }
          
          console.log(`Segment ${i} args:`, segmentArgs);
          await ffmpeg.exec(segmentArgs);
          segmentFiles.push(segmentFileName);
          
          // 更新进度
          const segmentProgress = 30 + (i + 1) * (50 / totalSegments);
          setProgress(Math.round(segmentProgress));
        }
        
        // 创建文件列表
        const fileList = segmentFiles.map(f => `file '${f}'`).join('\n');
        await ffmpeg.writeFile('filelist.txt', fileList);
        
        setProgress(80);
        
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
        const segment = segments[0];
        const execArgs = ['-i', inputFileName];
        
        // 添加时间裁剪
        execArgs.push('-ss', segment.start.toString());
        execArgs.push('-t', (segment.end - segment.start).toString());
        
        if (filterChain) {
          if (useComplexFilter) {
            execArgs.push('-filter_complex', filterChain);
          } else {
            execArgs.push('-vf', filterChain);
          }
        }
        
        execArgs.push(
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '23',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', 'faststart',
          outputFileName
        );
        
        setProgress(50);
        console.log('FFmpeg args:', execArgs);
        await ffmpeg.exec(execArgs);
        setProgress(80);
      }
      
      setProgress(90);
      
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
        
        // 清理内存
        URL.revokeObjectURL(url);
        
        setProgress(100);
        setIsProcessing(false);
        toast({ title: 'Export complete!', description: 'Your video has been exported with all effects applied.' });
      } catch (readError) {
        console.error('Failed to read output file:', readError);
        setIsProcessing(false);
        toast({ title: 'Export failed', description: 'Failed to read output file.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Export error:', error);
      setIsProcessing(false);
      toast({ title: 'Export failed', description: 'Failed to export video.', variant: 'destructive' });
    }
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
                  className={`w-full aspect-video rounded-lg bg-muted ${
                    isSettingZoomPosition ? 'cursor-crosshair' : ''
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
