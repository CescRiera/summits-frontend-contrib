import { WebPlugin } from "@capacitor/core";
import type { NativePullToRefreshPlugin } from "./index";

export class NativePullToRefreshWeb
  extends WebPlugin
  implements NativePullToRefreshPlugin
{
  async setEnabled(_options: { enabled: boolean }): Promise<void> {
    return;
  }

  async complete(): Promise<void> {
    return;
  }
}
