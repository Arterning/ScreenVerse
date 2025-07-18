"use client";

import SettingsPanel from "@/components/recording/SettingsPanel";
import { useRecording } from "@/components/recording/useRecording";
import type { Settings } from "@/components/recording/types";
import { Dispatch, SetStateAction } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export default function SettingsPage() {
  const { settings, setSettings, status } = useRecording();
  const { t } = useLanguage();

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{t('settingsTitle')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('settingsDesc')}
          </p>
        </div>
        
        <div className="flex justify-center">
          <SettingsPanel
            settings={settings}
            setSettings={setSettings as Dispatch<SetStateAction<Settings>>}
            isRecording={status === 'recording' || status === 'paused'}
          />
        </div>
      </div>
    </main>
  );
} 