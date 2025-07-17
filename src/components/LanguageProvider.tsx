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