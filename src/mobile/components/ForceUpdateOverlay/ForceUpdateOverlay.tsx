import React from 'react';
import MountainIcon from '../../../shared/components/MountainIcon/MountainIcon';
import styles from './ForceUpdateOverlay.module.css';
import { useI18n } from '../../../shared/context/I18nContext';
import { Capacitor } from '@capacitor/core';
import { GOOGLE_PLAY_STORE_URL, IOS_APP_STORE_URL } from '../../../shared/constants/storeLinks';

interface ForceUpdateOverlayProps {
  latestVersion: string;
  onClose: () => void;
}

const ForceUpdateOverlay: React.FC<ForceUpdateOverlayProps> = ({ latestVersion, onClose }) => {
  const { t } = useI18n();

  const handleUpdate = () => {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      window.open(GOOGLE_PLAY_STORE_URL, '_blank');
    } else if (platform === 'ios') {
      window.open(IOS_APP_STORE_URL, '_blank');
    } else {
      // For preview or other platforms, default to play store or something sensible
      window.open(GOOGLE_PLAY_STORE_URL, '_blank');
    }
  };

  return (
    <div className={styles["container"]}>
      <div className={styles["content"]}>
        <div className={styles["brandContainer"]}>
          <div className={styles["iconWrapper"]}>
            <MountainIcon size={64} />
          </div>
          <h1 className={`${styles["title"]} typography-headline-large`}>{t('forceUpdate.title')}</h1>
          <p className={`${styles["subtitle"]} typography-body-medium`}>{t('forceUpdate.subtitle')}</p>
        </div>

        <div className={styles["footer"]}>
          <button className={`${styles["updateButton"]} typography-button-large`} onClick={handleUpdate}>
            {t('forceUpdate.button')}
          </button>
          <button 
            className={`${styles["continueButton"]} typography-label-medium`} 
            onClick={onClose}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'rgb(71, 85, 105)',
              marginTop: '12px',
              textDecoration: 'underline'
            }}
          >
            {t('forceUpdate.continue')}
          </button>
          <span className={`${styles["versionText"]} typography-label-small`}>
            {t('forceUpdate.version')} {latestVersion}
          </span>
        </div>
      </div>
    </div>
  );
              };

export default ForceUpdateOverlay;
