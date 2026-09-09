/**
 * Detects if WebGL is supported and available in the current browser
 * @returns Object with isSupported flag and error message if not supported
 */
export const checkWebGLSupport = (): {
  isSupported: boolean;
  error?: string;
} => {
  try {
    // Check for WebGL support
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl") ||
      canvas.getContext("webgl2");

    if (!gl) {
      return {
        isSupported: false,
        error: "WebGL is not supported in your browser",
      };
    }

    // Mapbox GL JS works with WebGL 1.0 or 2.0, so if we have gl, we're good
    // Additional check: try to create a shader program to verify WebGL is functional
    if (gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext) {
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      if (!vertexShader) {
        return {
          isSupported: false,
          error: "WebGL shader creation failed",
        };
      }
      // Clean up
      gl.deleteShader(vertexShader);
    }

    return { isSupported: true };
  } catch (error) {
    return {
      isSupported: false,
      error: error instanceof Error ? error.message : "Unknown WebGL error",
    };
  }
};

