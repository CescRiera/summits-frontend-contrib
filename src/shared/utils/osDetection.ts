/**
 * Detects the operating system from navigator properties
 * @returns OS identifier string (e.g., "Windows 10", "macOS 14.0", "Linux", "iOS 17.0", "Android 13")
 */
export const detectOS = (): string => {
  const platform = navigator.platform || "";
  const userAgent = navigator.userAgent || "";

  // Windows detection
  if (platform.includes("Win")) {
    const versionMatch = userAgent.match(/Windows NT (\d+\.\d+)/);
    if (versionMatch) {
      const version = versionMatch[1];
      const versionMap: Record<string, string> = {
        "10.0": "Windows 10",
        "6.3": "Windows 8.1",
        "6.2": "Windows 8",
        "6.1": "Windows 7",
      };
      return (
        versionMap[version as keyof typeof versionMap] || `Windows ${version}`
      );
    }
    return "Windows";
  }

  // macOS detection
  if (platform.includes("Mac")) {
    const versionMatch = userAgent.match(/Mac OS X (\d+)[._](\d+)/);
    if (versionMatch) {
      const major = versionMatch[1];
      const minor = versionMatch[2];
      return `macOS ${major}.${minor}`;
    }
    return "macOS";
  }

  // iOS detection
  if (/iPad|iPhone|iPod/.test(platform) || /iPad|iPhone|iPod/.test(userAgent)) {
    const versionMatch = userAgent.match(/OS (\d+)[._](\d+)/);
    if (versionMatch) {
      const major = versionMatch[1];
      const minor = versionMatch[2];
      return `iOS ${major}.${minor}`;
    }
    return "iOS";
  }

  // Android detection
  if (/Android/.test(userAgent)) {
    const versionMatch = userAgent.match(/Android (\d+(?:\.\d+)?)/);
    if (versionMatch) {
      return `Android ${versionMatch[1]}`;
    }
    return "Android";
  }

  // Linux detection
  if (platform.includes("Linux")) {
    return "Linux";
  }

  // Fallback
  return "Unknown";
};
