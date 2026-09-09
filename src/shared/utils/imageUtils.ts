/**
 * Fixes iOS image orientation by re-drawing the image on a canvas.
 * iOS stores photos with EXIF orientation metadata instead of physically rotating pixels.
 * Drawing to canvas applies the EXIF orientation and produces a correctly-oriented image.
 * Also resizes large images to maxSize for better upload performance.
 *
 * @param file - The image file to fix
 * @param maxSize - Maximum width/height (default 1200px)
 * @param quality - JPEG quality 0-1 (default 0.85)
 * @returns Promise<File> - A new file with correct orientation
 */
export const fixImageOrientation = (
  file: File,
  maxSize: number = 1200,
  quality: number = 0.85
): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Create an image element to load the file
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Draw image to canvas - this automatically applies EXIF orientation
      // in modern browsers that support CSS image-orientation: from-image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not create blob from canvas"));
            return;
          }

          // Create a new File with the same name but as JPEG
          const fixedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".jpg"),
            {
              type: "image/jpeg",
              lastModified: Date.now(),
            }
          );

          resolve(fixedFile);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      reject(new Error("Could not load image"));
    };

    // Load the image from the file
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Optimizes image URLs to use 1000px max width for better performance
 * Converts URLs like: .../thumb/3/33/Filename.jpg/330px-Filename.jpg to .../thumb/3/33/Filename.jpg/1000px-Filename.jpg
 * For direct image URLs, converts them to thumbnail format with 1000px max width
 * This ensures all images are capped at 1000px width for optimal performance
 */
export const removeImageSizeRestriction = (
  imageUrl: string | null | undefined
): string | null => {
  if (!imageUrl) return null;

  const maxWidth = 1000;

  // Handle Wikimedia Commons images - ensure they use 1000px max width
  if (imageUrl.includes("wikimedia.org") || imageUrl.includes("/commons/")) {
    // If it's already a thumbnail URL, replace the size with 1000px
    if (imageUrl.includes("/thumb/")) {
      // Extract the base path and filename
      // Pattern: .../commons/thumb/3/33/Filename.jpg/330px-Filename.jpg
      // We want: .../commons/thumb/3/33/Filename.jpg/1000px-Filename.jpg
      const thumbMatch = imageUrl.match(
        /^(.+\/thumb\/[^/]+\/[^/]+\/[^/]+)\/[^/]+$/
      );
      if (thumbMatch && thumbMatch[1]) {
        const basePath = thumbMatch[1];
        // Extract filename from the base path
        const filenameMatch = basePath.match(/\/([^/]+\.[^/]+)$/);
        if (filenameMatch && filenameMatch[1]) {
          const filename = filenameMatch[1];
          // Use thumbnail API with max width of 1000px
          return `${basePath}/${maxWidth}px-${filename}`;
        }
      }
    } else {
      // If it's a direct image URL, convert to thumbnail format with 1000px
      // Pattern: .../commons/3/33/Filename.jpg
      // Should become: .../commons/thumb/3/33/Filename.jpg/1000px-Filename.jpg
      const commonsMatch = imageUrl.match(/^(.+\/commons\/)(.+)$/);
      if (commonsMatch && commonsMatch[1] && commonsMatch[2]) {
        const basePath = commonsMatch[1];
        const filePath = commonsMatch[2];
        // Extract filename from filePath
        const filenameMatch = filePath.match(/\/([^/]+\.[^/]+)$/);
        if (filenameMatch && filenameMatch[1]) {
          const filename = filenameMatch[1];
          return `${basePath}thumb/${filePath}/${maxWidth}px-${filename}`;
        }
      }
    }
  }

  // For other image sources, try to replace any size restrictions with 1000px
  // This handles cases where images might have size prefixes like /500px- or /1200px-
  if (imageUrl.match(/\/\d+px-/)) {
    return imageUrl.replace(/\/\d+px-/g, `/${maxWidth}px-`);
  }

  // If we can't optimize, return the original
  return imageUrl;
};

/**
 * Optimizes image URLs to use 1000px max width (keeps original if no restriction found)
 * This is a safer version that only modifies known size patterns
 * Converts URLs to use 1000px max width for better performance
 */
export const removeImageSizeRestrictionSafe = (
  imageUrl: string | null | undefined
): string | null => {
  if (!imageUrl) return null;

  const maxWidth = 1000;

  // Handle Wikimedia Commons images - ensure they use 1000px max width
  if (imageUrl.includes("wikimedia.org") || imageUrl.includes("/commons/")) {
    // If it's already a thumbnail URL, replace the size with 1000px
    if (imageUrl.includes("/thumb/")) {
      // Extract the base path and filename
      const thumbMatch = imageUrl.match(
        /^(.+\/thumb\/[^/]+\/[^/]+\/[^/]+)\/[^/]+$/
      );
      if (thumbMatch && thumbMatch[1]) {
        const basePath = thumbMatch[1];
        const filenameMatch = basePath.match(/\/([^/]+\.[^/]+)$/);
        if (filenameMatch && filenameMatch[1]) {
          const filename = filenameMatch[1];
          return `${basePath}/${maxWidth}px-${filename}`;
        }
      }
    } else {
      // If it's a direct image URL, convert to thumbnail format with 1000px
      const commonsMatch = imageUrl.match(/^(.+\/commons\/)(.+)$/);
      if (commonsMatch && commonsMatch[1] && commonsMatch[2]) {
        const basePath = commonsMatch[1];
        const filePath = commonsMatch[2];
        const filenameMatch = filePath.match(/\/([^/]+\.[^/]+)$/);
        if (filenameMatch && filenameMatch[1]) {
          const filename = filenameMatch[1];
          return `${basePath}thumb/${filePath}/${maxWidth}px-${filename}`;
        }
      }
    }
  }

  // Only modify if we find size patterns to avoid breaking other URLs
  if (imageUrl.match(/\/\d+px-/)) {
    return imageUrl.replace(/\/\d+px-/g, `/${maxWidth}px-`);
  }

  // If no size pattern found, return original
  return imageUrl;
};

/**
 * Optimizes image URL for grid thumbnails by using appropriate size
 * For Wikimedia Commons, uses thumbnail API with max width of 1000px for better performance
 * This prevents loading multi-MB images in grid views
 */
export const getOptimizedThumbnailUrl = (
  imageUrl: string | null | undefined,
  maxWidth: number = 1000
): string | null => {
  if (!imageUrl) return null;

  // For Wikimedia Commons images, use the thumbnail API with a reasonable size
  // This ensures we get optimized images instead of full resolution (which can be several MB)
  if (imageUrl.includes("wikimedia.org") || imageUrl.includes("/commons/")) {
    // If it's already a thumbnail URL, replace the size
    if (imageUrl.includes("/thumb/")) {
      // Extract the base path and filename
      // Pattern: .../commons/thumb/3/33/Filename.jpg/330px-Filename.jpg
      // We want: .../commons/thumb/3/33/Filename.jpg/1000px-Filename.jpg
      const thumbMatch = imageUrl.match(
        /^(.+\/thumb\/[^/]+\/[^/]+\/[^/]+)\/[^/]+$/
      );
      if (thumbMatch && thumbMatch[1]) {
        const basePath = thumbMatch[1];
        // Extract filename from the base path
        const filenameMatch = basePath.match(/\/([^/]+\.[^/]+)$/);
        if (filenameMatch && filenameMatch[1]) {
          const filename = filenameMatch[1];
          // Use thumbnail API with max width
          return `${basePath}/${maxWidth}px-${filename}`;
        }
      }
    } else {
      // If it's a direct image URL, convert to thumbnail format
      // Pattern: .../commons/3/33/Filename.jpg
      // Should become: .../commons/thumb/3/33/Filename.jpg/1000px-Filename.jpg
      const commonsMatch = imageUrl.match(/^(.+\/commons\/)(.+)$/);
      if (commonsMatch && commonsMatch[1] && commonsMatch[2]) {
        const basePath = commonsMatch[1];
        const filePath = commonsMatch[2];
        // Extract filename from filePath
        const filenameMatch = filePath.match(/\/([^/]+\.[^/]+)$/);
        if (filenameMatch && filenameMatch[1]) {
          const filename = filenameMatch[1];
          return `${basePath}thumb/${filePath}/${maxWidth}px-${filename}`;
        }
      }
    }
  }

  // For other image sources, return as-is (they may have their own CDN optimization)
  // Or if we can't optimize, return the original
  return imageUrl;
};
