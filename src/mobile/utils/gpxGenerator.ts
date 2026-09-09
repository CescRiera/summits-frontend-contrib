import type { RouteCoordinate } from "../../shared/api/types/routes";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

/**
 * Generate GPX content from route coordinates
 */
export function generateGPX(
  coordinates: RouteCoordinate[],
  routeName: string,
  routeDate?: string
): string {
  if (coordinates.length === 0) {
    throw new Error("No coordinates provided for GPX generation");
  }

  // Use current date if no route date provided
  const date = routeDate ? new Date(routeDate) : new Date();
  const isoDate = date.toISOString();

  // Generate track points
  const trackPoints = coordinates
    .map((coord) => {
      const timestamp = coord.timestamp
        ? new Date(coord.timestamp).toISOString()
        : isoDate;

      return `    <trkpt lat="${coord.lat}" lon="${coord.lng}">
      <ele>${coord.elevation}</ele>
      <time>${timestamp}</time>
    </trkpt>`;
    })
    .join("\n");

  // Generate GPX content
  const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CIMS" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(routeName)}</name>
    <time>${isoDate}</time>
  </metadata>
  <trk>
    <name>${escapeXml(routeName)}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;

  return gpxContent;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Download GPX file
 * On native platforms, saves the file to the device's accessible storage and shows success message
 * On web platforms, downloads the file directly to browser downloads folder
 */
export async function downloadGPX(
  gpxContent: string,
  filename: string,
  onShowSuccessModal?: (fileName: string, fileUri: string) => void
): Promise<void> {
  // Check if we're on a native platform
  if (Capacitor.isNativePlatform()) {
    try {
      // Save to External directory for better sharing compatibility
      const fileName = `${filename}.gpx`;

      let writeResult;
      try {
        // Try External directory first (more accessible for sharing)
        writeResult = await Filesystem.writeFile({
          path: `Documents/${fileName}`,
          data: gpxContent,
          directory: Directory.External,
          encoding: Encoding.UTF8,
        });
      } catch (externalError) {
        console.warn('Could not save to External/Documents, falling back to Documents:', externalError);
        // Fallback to Documents directory
        writeResult = await Filesystem.writeFile({
          path: fileName,
          data: gpxContent,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
      }

      console.log('GPX file saved to:', writeResult.uri);

      // Show success modal instead of alert
      if (onShowSuccessModal) {
        onShowSuccessModal(fileName, writeResult.uri);
      } else {
        // Fallback to alert if no modal callback provided
        alert(`GPX file "${filename}.gpx" has been saved successfully!`);
      }

    } catch (error) {
      console.error('Error saving GPX file on native platform:', error);
      alert('Failed to save GPX file. Please try again.');
      // Fallback to web download approach if native saving fails
      fallbackDownloadGPX(gpxContent, filename);
    }
  } else {
    // On web platforms, use the traditional download method
    fallbackDownloadGPX(gpxContent, filename);
  }
}

/**
 * Fallback download method for web platforms or when native sharing fails
 */
function fallbackDownloadGPX(gpxContent: string, filename: string): void {
  const blob = new Blob([gpxContent], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.gpx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Generate filename from route name
 */
export function generateFilename(routeName: string | null | undefined): string {
  // Remove special characters and replace spaces with underscores
  return (routeName || "route")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase()
    .substring(0, 50); // Limit length
}
