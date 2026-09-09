import type { RouteCoordinate } from "../../shared/api/types/routes";

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
 * For desktop/web platforms, downloads the file directly using browser download
 */
export async function downloadGPX(gpxContent: string, filename: string): Promise<void> {
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
