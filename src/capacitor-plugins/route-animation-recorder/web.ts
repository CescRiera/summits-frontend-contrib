import { WebPlugin } from '@capacitor/core';
import type { RouteAnimationRecorderPlugin, RouteAnimationRecorderConfig } from './index';

export class RouteAnimationRecorderWeb extends WebPlugin implements RouteAnimationRecorderPlugin {
  async startRecording(_config: RouteAnimationRecorderConfig): Promise<{ recordingId: string }> {
    throw new Error('RouteAnimationRecorder is not available on web. Use canvas-based recording instead.');
  }

  async addFrame(_options: { recordingId: string; frameData: string }): Promise<void> {
    throw new Error('RouteAnimationRecorder is not available on web.');
  }

  async stopRecording(_options: { recordingId: string }): Promise<{ filePath: string; fileUri: string }> {
    throw new Error('RouteAnimationRecorder is not available on web.');
  }

  async cancelRecording(_options: { recordingId: string }): Promise<void> {
    throw new Error('RouteAnimationRecorder is not available on web.');
  }
}


















