'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react';

const messages = {
  zh: {
    appName: 'ScreenVerse 屏幕录制',
    settings: '设置',
    myRecordings: '我的录屏',
    readyToRecord: '准备录制',
    configureRecordingSettings: '配置您的录制设置并开始捕捉屏幕。',
    exportFormat: '导出格式',
    recommended: '推荐',
    startRecording: '开始录制',
    saveSuccess: '保存成功',
    saveToLibrary: '录屏已保存到您的库中',
    saveFailed: '保存失败',
    saveFailedDesc: '无法保存录屏到库中',
    errorPrepareEdit: '编辑准备失败',
    errorSaveEditor: '无法为编辑器保存视频，请重试。',
    reset: '重置',
    resetConfirm: '此操作会删除所有在时间轴上的修改，确认继续吗？',
    settingsTitle: '录制设置',
    settingsDesc: '配置您的屏幕录制设置，包括视频质量、音频选项和鼠标效果。',
    videoTab: '视频',
    audioTab: '音频',
    mouseTab: '鼠标',
    resolution: '分辨率',
    frameRate: '帧率 (FPS)',
    pip: '画中画',
    pipDesc: '在录制中叠加摄像头画面。',
    systemAudio: '系统音频',
    systemAudioDesc: '录制来自电脑的音频。',
    microphone: '麦克风',
    microphoneDesc: '录制您的麦克风声音。',
    highlightCursor: '高亮鼠标',
    highlightCursorDesc: '在鼠标周围显示光环。',
    highlightClicks: '高亮点击',
    highlightClicksDesc: '动画显示鼠标点击。',
    followMouse: '跟随并缩放鼠标',
    followMouseDesc: '缩放并跟随鼠标指针。',
    playPause: '播放/暂停',
    cancelZoomPosition: '取消设置放大位置',
    cancel: '取消',
    addZoomRegion: '添加 Zoom 区域',
    zoom: '放大',
    addTrimRegion: '添加 Trim 区域',
    trim: '裁剪',
    undo: '撤销',
    redo: '重做',
    deleteSelectedRegion: '删除选中区域',
    timelineScale: '缩放',
    zoomRegionAdded: '放大区域已添加',
    zoomRegionAddedDesc: ({x, y}: {x: number, y: number}) => `放大中心点设置在 (${x}%, ${y}%)，可以继续播放视频查看效果`,
    cancelled: '已取消',
    zoomPositionCancelled: '放大位置设置已取消，可以继续播放视频',
    setZoomPosition: '设置放大位置',
    setZoomPositionDesc: '视频已暂停，点击视频上的任意位置来设置放大中心点',
    paramError: '参数错误',
    missingVideoId: '缺少视频ID参数',
    videoNotFound: '视频不存在',
    cannotFindVideo: '无法找到指定的视频文件',
    videoLoaded: '视频加载成功',
    videoLoadedDesc: '视频已加载，可以开始编辑',
    loadFailed: '加载失败',
    cannotLoadVideo: '无法加载视频文件',
    ffmpegNotLoaded: 'FFmpeg 未加载',
    trimmingComplete: '裁剪完成',
    trimmingCompleteDesc: '您的视频已被裁剪。',
    videoNotLoaded: '视频未加载',
    canvasInitializationFailed: 'Canvas 初始化失败',
    exportComplete: '导出完成',
    exportCompleteDesc: '视频已导出为 webm 文件',
    exportSettings: '导出设置',
    aspectRatio: '宽高比',
    selectAspectRatio: '选择宽高比',
    widescreen: '宽屏',
    standard: '标准',
    square: '正方形',
    portrait: '竖屏',
    background: '背景',
    selectBackground: '选择背景',
    noneBgName: '无 (透明)',
    blackBgName: '黑色',
    whiteBgName: '白色',
    // tech-blueBgName: '科技蓝',
    // cyber-gridBgName: '赛博网格',
    // neon-purpleBgName: '霓虹紫',
    // matrix-greenBgName: '矩阵绿',
    // futuristic-orangeBgName: '未来橙',
    customImage: '自定义图片',
    uploadBackground: '上传背景',
    processing: '处理中...',
    exporting: '正在导出...',
    exportVideo: '导出视频',
    // ... 其他 key
  },
  en: {
    appName: 'ScreenVerse',
    settings: 'Settings',
    myRecordings: 'My Recordings',
    readyToRecord: 'Ready to Record',
    configureRecordingSettings: 'Configure your recording settings and start capturing your screen.',
    exportFormat: 'Export Format',
    recommended: 'Recommended',
    startRecording: 'Start Recording',
    saveSuccess: 'Saved',
    saveToLibrary: 'Recording has been saved to your library',
    saveFailed: 'Save Failed',
    saveFailedDesc: 'Could not save recording to library',
    errorPrepareEdit: 'Error preparing for edit',
    errorSaveEditor: 'Could not save the video for the editor. Please try again.',
    reset: 'Reset',
    resetConfirm: 'This will delete all changes on the timeline. Are you sure you want to continue?',
    settingsTitle: 'Recording Settings',
    settingsDesc: 'Configure your screen recording settings, including video quality, audio options, and mouse effects.',
    videoTab: 'Video',
    audioTab: 'Audio',
    mouseTab: 'Mouse',
    resolution: 'Resolution',
    frameRate: 'Frame Rate (FPS)',
    pip: 'Picture-in-Picture',
    pipDesc: 'Overlay your camera on the recording.',
    systemAudio: 'System Audio',
    systemAudioDesc: 'Record audio from your computer.',
    microphone: 'Microphone',
    microphoneDesc: 'Record your voice.',
    highlightCursor: 'Highlight Cursor',
    highlightCursorDesc: 'Show a halo around the mouse.',
    highlightClicks: 'Highlight Clicks',
    highlightClicksDesc: 'Animate mouse clicks.',
    followMouse: 'Follow & Zoom Mouse',
    followMouseDesc: 'Zoom and follow the cursor.',
    playPause: 'Play/Pause',
    cancelZoomPosition: 'Cancel Zoom Position',
    cancel: 'Cancel',
    addZoomRegion: 'Add Zoom Region',
    zoom: 'Zoom',
    addTrimRegion: 'Add Trim Region',
    trim: 'Trim',
    undo: 'Undo',
    redo: 'Redo',
    deleteSelectedRegion: 'Delete Selected Region',
    timelineScale: 'Scale',
    zoomRegionAdded: 'Zoom region added',
    zoomRegionAddedDesc: ({x, y}: {x: number, y: number}) => `Zoom center set at (${x}%, ${y}%), you can continue to play the video to see the effect.`,
    cancelled: 'Cancelled',
    zoomPositionCancelled: 'Zoom position setting cancelled, you can continue to play the video',
    setZoomPosition: 'Set Zoom Position',
    setZoomPositionDesc: 'Video paused, click anywhere on the video to set the zoom center',
    paramError: 'Parameter Error',
    missingVideoId: 'Missing video ID parameter',
    videoNotFound: 'Video not found',
    cannotFindVideo: 'Cannot find the specified video file',
    videoLoaded: 'Video loaded',
    videoLoadedDesc: 'Video loaded, you can start editing',
    loadFailed: 'Load failed',
    cannotLoadVideo: 'Cannot load video file',
    ffmpegNotLoaded: 'FFmpeg not loaded',
    trimmingComplete: 'Trimming complete',
    trimmingCompleteDesc: 'Your video has been trimmed.',
    videoNotLoaded: 'Video not loaded',
    canvasInitializationFailed: 'Canvas initialization failed',
    exportComplete: 'Export complete',
    exportCompleteDesc: 'Video has been exported as a webm file',
    exportSettings: 'Export Settings',
    aspectRatio: 'Aspect Ratio',
    selectAspectRatio: 'Select aspect ratio',
    widescreen: 'Widescreen',
    standard: 'Standard',
    square: 'Square',
    portrait: 'Portrait',
    background: 'Background',
    selectBackground: 'Select background',
    noneBgName: 'None (Transparent)',
    blackBgName: 'Black',
    whiteBgName: 'White',
    // tech-blueBgName: 'Tech Blue',
    // cyber-gridBgName: 'Cyber Grid',
    // neon-purpleBgName: 'Neon Purple',
    // matrix-greenBgName: 'Matrix Green',
    // futuristic-orangeBgName: 'Futuristic Orange',
    customImage: 'Custom Image',
    uploadBackground: 'Upload Background',
    processing: 'Processing...',
    exporting: 'Exporting...',
    exportVideo: 'Export Video',
    // ... other keys
  }
};

export type Lang = 'zh' | 'en';

type MessageValue = string | ((params?: Record<string, any>) => string);

interface LanguageContextProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof messages['zh'], params?: any) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh');
  const t = (key: keyof typeof messages['zh'], params?: any) => {
    const value = messages[lang][key];
    if (typeof value === 'function') {
      return value(params || {});
    }
    return value || key;
  };
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
} 