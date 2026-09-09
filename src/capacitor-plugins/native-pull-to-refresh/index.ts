import { registerPlugin } from "@capacitor/core";

export interface NativePullToRefreshPlugin {
  setEnabled(options: { enabled: boolean }): Promise<void>;
  complete(): Promise<void>;
}

const NativePullToRefresh = registerPlugin<NativePullToRefreshPlugin>(
  "NativePullToRefresh",
  {
    web: () =>
      import("./web").then((m) => new m.NativePullToRefreshWeb()),
  }
);

export { NativePullToRefresh };
