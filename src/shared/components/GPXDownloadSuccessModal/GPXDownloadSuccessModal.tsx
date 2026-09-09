import React from "react";
import { X, Check, FolderOpen, Share2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";
import AppModal from "../AppModal";
import styles from "./GPXDownloadSuccessModal.module.css";

interface GPXDownloadSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileUri: string;
}

const GPXDownloadSuccessModal: React.FC<GPXDownloadSuccessModalProps> = ({
  isOpen,
  onClose,
  fileName,
  fileUri,
}) => {

  const handleOpenFolder = () => {
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();

      if (platform === 'ios') {
        // On iOS, try to open the Files app
        try {
          window.open('shareddocuments://', '_blank');
        } catch (error) {
          console.warn('Could not open Files app:', error);
          alert('Please open the Files app and look for the Summits folder.');
        }
      } else {
        // On Android, direct folder opening is not reliable
        // Just show instructions and close modal
        alert('Please open your Files app and navigate to Documents folder.');
      }
    }
    onClose();
  };

  const handleShareFile = async () => {
    try {
      // Try to share with file attachment
      let shareUri = fileUri;

      // Get a proper URI for sharing
      if (Capacitor.isNativePlatform()) {
        try {
          // Try to get URI from the saved location
          const path = fileUri.includes('Documents/') ? `Documents/${fileName}` : fileName;
          const directory = fileUri.includes('/storage/emulated/0/') ? Directory.External : Directory.Documents;

          const uriResult = await Filesystem.getUri({
            path: path,
            directory: directory,
          });
          shareUri = uriResult.uri;
          console.log('Share URI:', shareUri);
        } catch (uriError) {
          console.warn('Could not get share URI:', uriError);
        }
      }

      const shareOptions: any = {
        title: 'Share GPX Route',
        text: `Check out this route: ${fileName}. GPX file attached.`,
        dialogTitle: 'Share GPX Route',
      };

      if (shareUri) {
        shareOptions.files = [shareUri];
      }

      await Share.share(shareOptions);
    } catch (error) {
      console.error('Error sharing file:', error);
      // Fallback: share without file attachment but with location info
      try {
        const platform = Capacitor.getPlatform();
        const locationInfo = platform === 'ios'
          ? 'Find it in Files app under "On My iPhone/iPad > Summits"'
          : 'Find it in Files app under "Internal storage > Documents"';

        await Share.share({
          title: 'Share GPX Route',
          text: `Check out this route: ${fileName}\n\n📂 ${locationInfo}`,
          dialogTitle: 'Share GPX Route',
        });
      } catch (fallbackError) {
        console.error('Fallback share also failed:', fallbackError);
        alert('Could not share the file. The GPX file has been saved to your device.');
      }
    }
    onClose();
  };

  const platform = Capacitor.getPlatform();

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      ariaLabel="GPX download success"
      contentClassName={styles["gpx-modal__popup"]}
    >
        <button
          className={styles["gpx-modal__close-button"]}
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className={styles["gpx-modal__content"]}>
          <div className={styles["gpx-modal__icon-container"]}>
            <div className={styles["gpx-modal__icon"]}>
              <Check size={28} />
            </div>
          </div>

          <h2 className={`${styles["gpx-modal__title"]} typography-title-medium`}>
            GPX File Downloaded! 🎉
          </h2>

          <p className={`${styles["gpx-modal__message"]} typography-body-medium`}>
            <strong>{fileName}.gpx</strong> has been saved successfully.
          </p>

          <div className={styles["gpx-modal__file-info"]}>
            {platform === 'ios' ? (
              <p className="typography-body-small">
                📂 Find it in the <strong>Files app</strong> under "On My iPhone/iPad &gt; Summits"
              </p>
            ) : (
              <p className="typography-body-small">
                📂 Find it in your <strong>Files app</strong> under "Internal storage &gt; Documents" or "Documents"
              </p>
            )}
          </div>

          <div className={styles["gpx-modal__button-container"]}>
            <button
              className={`${styles["gpx-modal__button"]} ${styles["gpx-modal__button--primary"]} typography-button-medium`}
              onClick={handleOpenFolder}
            >
              <FolderOpen size={18} />
              Open Folder
            </button>

            <button
              className={`${styles["gpx-modal__button"]} ${styles["gpx-modal__button--secondary"]} typography-button-medium`}
              onClick={handleShareFile}
            >
              <Share2 size={18} />
              Share File
            </button>
          </div>
        </div>
    </AppModal>
  );
};

export default GPXDownloadSuccessModal;
