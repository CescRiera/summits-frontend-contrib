import { registerPlugin } from '@capacitor/core';

export interface RouteAnimationRecorderConfig {
  /** Width of the video in pixels */
  width: number;
  /** Height of the video in pixels */
  height: number;
  /** Frames per second (default: 60) */
  fps?: number;
  /** Video bitrate in bits per second (default: 50000000 = 50 Mbps) */
  bitrate?: number;
  /** Output file name (without extension) */
  filename?: string;
}

export interface RouteAnimationRecorderPlugin {
  /**
   * Start recording frames from the WebView
   * Returns a recording ID that can be used to add frames and stop recording
   */
  startRecording(config: RouteAnimationRecorderConfig): Promise<{ recordingId: string }>;

  /**
   * Add a frame to the recording
   * Frame data should be base64 encoded image data (PNG or JPEG)
   */
  addFrame(options: { recordingId: string; frameData: string }): Promise<void>;

  /**
   * Stop recording and get the file path
   * Returns the path to the recorded video file
   */
  stopRecording(options: { recordingId: string }): Promise<{ filePath: string; fileUri: string }>;

  /**
   * Cancel recording and clean up resources
   */
  cancelRecording(options: { recordingId: string }): Promise<void>;
}

const RouteAnimationRecorder = registerPlugin<RouteAnimationRecorderPlugin>(
  'RouteAnimationRecorder',
  {
    web: () => import('./web').then(m => m.RouteAnimationRecorderWeb),
  }
);

export { RouteAnimationRecorder };


















