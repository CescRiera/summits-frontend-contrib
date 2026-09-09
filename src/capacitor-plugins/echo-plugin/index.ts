import { registerPlugin } from '@capacitor/core';

export interface EchoPlugin {
  /**
   * Echoes back the provided value
   */
  echo(options: { value: string }): Promise<{ value: string }>;
}

const Echo = registerPlugin<EchoPlugin>('Echo', {
  web: () => import('./web').then(m => new m.EchoWeb()),
});

export * from './definitions';
export { Echo };
