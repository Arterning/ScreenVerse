import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Download, Upload } from 'lucide-react';
import { useLanguage } from "@/components/LanguageProvider";

// 预置背景图片
const PRESET_BACKGROUNDS = [
  {
    id: 'none',
    name: 'None (Transparent)',
    url: null
  },
  {
    id: 'black',
    name: 'Black',
    url: null
  },
  {
    id: 'white',
    name: 'White',
    url: null
  },
  {
    id: 'tech-blue',
    name: 'Tech Blue',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop'
  },
  // {
  //   id: 'cyber-grid',
  //   name: 'Cyber Grid',
  //   url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop'
  // },
  {
    id: 'neon-purple',
    name: 'Neon Purple',
    url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=600&fit=crop'
  },
  {
    id: 'matrix-green',
    name: 'Matrix Green',
    url: 'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=800&h=600&fit=crop'
  },
  {
    id: 'futuristic-orange',
    name: 'Futuristic Orange',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop'
  }
];

interface ExportPanelProps {
  onExport: () => void;
  isProcessing: boolean;
  progress?: number;
  aspectRatio: string;
  onAspectRatioChange: (value: string) => void;
  background: string;
  onBackgroundChange: (value: string) => void;
  onBackgroundUpload: (file: File) => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  onExport,
  isProcessing,
  progress = 0,
  aspectRatio,
  onAspectRatioChange,
  background,
  onBackgroundChange,
  onBackgroundUpload,
}) => {
  const [customBackground, setCustomBackground] = useState<string>('');
  const { t } = useLanguage();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCustomBackground(result);
        onBackgroundUpload(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedBackground = PRESET_BACKGROUNDS.find(bg => bg.id === background);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('exportSettings')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Aspect Ratio */}
        <div className="space-y-2">
          <Label htmlFor="aspect-ratio">{t('aspectRatio')}</Label>
          <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectAspectRatio')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="16:9">16:9 ({t('widescreen')})</SelectItem>
              <SelectItem value="4:3">4:3 ({t('standard')})</SelectItem>
              <SelectItem value="1:1">1:1 ({t('square')})</SelectItem>
              <SelectItem value="9:16">9:16 ({t('portrait')})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Background */}
        <div className="space-y-2">
          <Label htmlFor="background">{t('background')}</Label>
          <Select value={background} onValueChange={onBackgroundChange}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectBackground')} />
            </SelectTrigger>
            <SelectContent>
              {PRESET_BACKGROUNDS.map(bg => (
                <SelectItem key={bg.id} value={bg.id}>
                  {t(bg.id)}
                </SelectItem>
              ))}
              <SelectItem value="custom">{t('customImage')}</SelectItem>
            </SelectContent>
          </Select>
          
          {/* 背景预览 */}
          {selectedBackground?.url && (
            <div className="mt-2">
              <img 
                src={selectedBackground.url} 
                alt={t(selectedBackground.id + 'BgName')} 
                className="w-full h-20 object-cover rounded border"
              />
            </div>
          )}
          
          {background === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="background-upload">{t('uploadBackground')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="background-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="flex-1"
                />
                <Upload className="w-4 h-4 text-muted-foreground" />
              </div>
              {customBackground && (
                <div className="mt-2">
                  <img 
                    src={customBackground} 
                    alt={t('customImage')}
                    className="w-full h-20 object-cover rounded border"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{t('processing')}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Export Button */}
        <Button 
          onClick={onExport} 
          disabled={isProcessing} 
          className="w-full"
          size="lg"
        >
          <Download className="mr-2 h-4 w-4" />
          {isProcessing ? t('exporting') : t('exportVideo')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ExportPanel; 