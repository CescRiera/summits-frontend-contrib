import { useEffect, useState } from "react";
import { useOnlineStatus } from "../../../shared/hooks/useOnlineStatus";
import { useI18n } from "../../../shared/context/I18nContext";
import { listRegions, memoryCacheSize, subscribeRegionsChanged } from "../../../shared/offline";
import styles from "./OfflineBanner.module.css";

const OfflineBanner = () => {
  const isOnline = useOnlineStatus();
  const { t } = useI18n();
  const [cachedTiles, setCachedTiles] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      listRegions()
        .then((regions) => {
          if (cancelled) return;
          const regionTiles = regions.reduce((sum, r) => sum + r.doneTiles, 0);
          setCachedTiles(regionTiles + memoryCacheSize());
        })
        .catch(() => undefined);
    };
    const unsub = subscribeRegionsChanged(refresh);
    refresh();
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  if (isOnline) return null;

  const message = cachedTiles > 0 ? t("offline.bannerCached") : t("offline.bannerNoCache");

  return (
    <div className={styles["offlineBanner"]}>
      <span className={`${styles["offlineBanner__text"]} typography-label-small`}>
        {message}
      </span>
    </div>
  );
};

export default OfflineBanner;
