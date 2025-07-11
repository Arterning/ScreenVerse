export type RecordingStatus = "idle" | "recording" | "paused" | "preview" | "converting";
export type ExportFormat = "video/webm" | "video/mp4" | "image/gif";

export interface Settings {
  resolution: string;
  frameRate: string;
  includeSystemAudio: boolean;
  includeMic: boolean;
  pipEnabled: boolean;
  highlightCursor: boolean;
  highlightClicks: boolean;
  followMouse: boolean;
  exportFormat: ExportFormat;
}
