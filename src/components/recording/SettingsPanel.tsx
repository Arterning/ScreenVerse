"use client";

import {
  Mic,
  MousePointer,
  Settings,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Settings as ISettings } from "./types";
import { useLanguage } from "@/components/LanguageProvider";

interface SettingsPanelProps {
  settings: ISettings;
  setSettings: React.Dispatch<React.SetStateAction<ISettings>>;
  isRecording: boolean;
}

export default function SettingsPanel({
  settings,
  setSettings,
  isRecording,
}: SettingsPanelProps) {
  const { t } = useLanguage();
  const handleSwitchChange = (key: keyof ISettings) => (value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectChange = (key: keyof ISettings) => (value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <fieldset
      disabled={isRecording}
      className="w-full max-w-md lg:max-w-xl sticky top-20 self-start"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" /> {t('settingsTitle')}
          </CardTitle>
          <CardDescription>
            {t('settingsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="video">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="video">
                <Video className="w-4 h-4 mr-1 inline-block" /> {t('videoTab')}
              </TabsTrigger>
              <TabsTrigger value="audio">
                <Mic className="w-4 h-4 mr-1 inline-block" /> {t('audioTab')}
              </TabsTrigger>
              <TabsTrigger value="mouse">
                <MousePointer className="w-4 h-4 mr-1 inline-block" /> {t('mouseTab')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="video" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{t('resolution')}</Label>
                <Select
                  value={settings.resolution}
                  onValueChange={handleSelectChange("resolution")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720">720p (HD)</SelectItem>
                    <SelectItem value="1080">1080p (Full HD)</SelectItem>
                    <SelectItem value="1440">1440p (2K)</SelectItem>
                    <SelectItem value="2160">2160p (4K)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('frameRate')}</Label>
                <Select
                  value={settings.frameRate}
                  onValueChange={handleSelectChange("frameRate")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 FPS</SelectItem>
                    <SelectItem value="60">60 FPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>{t('pip')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('pipDesc')}
                  </p>
                </div>
                <Switch
                  checked={settings.pipEnabled}
                  onCheckedChange={handleSwitchChange("pipEnabled")}
                />
              </div>
            </TabsContent>
            <TabsContent value="audio" className="space-y-4 pt-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>{t('systemAudio')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('systemAudioDesc')}
                  </p>
                </div>
                <Switch
                  checked={settings.includeSystemAudio}
                  onCheckedChange={handleSwitchChange("includeSystemAudio")}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>{t('microphone')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('microphoneDesc')}
                  </p>
                </div>
                <Switch
                  checked={settings.includeMic}
                  onCheckedChange={handleSwitchChange("includeMic")}
                />
              </div>
            </TabsContent>
            <TabsContent value="mouse" className="space-y-4 pt-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>{t('highlightCursor')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('highlightCursorDesc')}
                  </p>
                </div>
                <Switch
                  checked={settings.highlightCursor}
                  onCheckedChange={handleSwitchChange("highlightCursor")}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>{t('highlightClicks')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('highlightClicksDesc')}
                  </p>
                </div>
                <Switch
                  checked={settings.highlightClicks}
                  onCheckedChange={handleSwitchChange("highlightClicks")}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>{t('followMouse')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('followMouseDesc')}
                  </p>
                </div>
                <Switch
                  checked={settings.followMouse}
                  onCheckedChange={handleSwitchChange("followMouse")}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </fieldset>
  );
}
