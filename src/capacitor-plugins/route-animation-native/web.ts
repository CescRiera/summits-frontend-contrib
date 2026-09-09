import { WebPlugin } from '@capacitor/core';
import type { RouteAnimationNativePlugin, RouteAnimationNativeConfig } from './index';

export class RouteAnimationNativeWeb extends WebPlugin implements RouteAnimationNativePlugin {
  async startAnimation(_config: RouteAnimationNativeConfig): Promise<void> {
    throw new Error('RouteAnimationNative is not available on web. This feature is only available on native Android/iOS platforms.');
  }
}

















