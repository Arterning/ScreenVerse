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
    // ... other keys
  }
};

export type Lang = 'zh' | 'en';

interface LanguageContextProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof messages['zh']) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh');
  const t = (key: keyof typeof messages['zh']) => messages[lang][key] || key;
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