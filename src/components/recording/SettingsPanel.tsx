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
  const handleSwitchChange = (key: keyof ISettings) => (value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectChange = (key: keyof ISettings) => (value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <fieldset
      disabled={isRecording}
      className="w-full max-w-md lg:max-w-sm sticky top-20 self-start"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" /> Recording Settings
          </CardTitle>
          <CardDescription>
            Configure your screen capture settings before you start.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="video">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="video">
                <Video className="w-4 h-4 mr-1 inline-block" />
                Video
              </TabsTrigger>
              <TabsTrigger value="audio">
                <Mic className="w-4 h-4 mr-1 inline-block" />
                Audio
              </TabsTrigger>
              <TabsTrigger value="mouse">
                <MousePointer className="w-4 h-4 mr-1 inline-block" />
                Mouse
              </TabsTrigger>
            </TabsList>
            <TabsContent value="video" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Resolution</Label>
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
                <Label>Frame Rate (FPS)</Label>
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
                  <Label>Picture-in-Picture</Label>
                  <p className="text-xs text-muted-foreground">
                    Overlay your camera on the recording.
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
                  <Label>System Audio</Label>
                  <p className="text-xs text-muted-foreground">
                    Record audio from your computer.
                  </p>
                </div>
                <Switch
                  checked={settings.includeSystemAudio}
                  onCheckedChange={handleSwitchChange("includeSystemAudio")}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Microphone</Label>
                  <p className="text-xs text-muted-foreground">
                    Record your voice.
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
                  <Label>Highlight Cursor</Label>
                  <p className="text-xs text-muted-foreground">
                    Show a halo around the mouse.
                  </p>
                </div>
                <Switch
                  checked={settings.highlightCursor}
                  onCheckedChange={handleSwitchChange("highlightCursor")}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Highlight Clicks</Label>
                  <p className="text-xs text-muted-foreground">
                    Animate mouse clicks.
                  </p>
                </div>
                <Switch
                  checked={settings.highlightClicks}
                  onCheckedChange={handleSwitchChange("highlightClicks")}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Follow & Zoom Mouse</Label>
                  <p className="text-xs text-muted-foreground">
                    Zoom and follow the cursor.
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
