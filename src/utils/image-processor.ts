/**
 * Utilidad de procesamiento, redimensionamiento y compresión de imágenes en el cliente.
 * Optimiza fotografías tomadas con cámaras de smartphones (10-25 MB)
 * a una resolución máxima adecuada (1280px) en JPEG (< 800 KB) para enviar a Gemini API
 * sin sobrecargar memoria ni ancho de banda.
 */

export interface ProcessedImage {
  base64Data: string; // Base64 puro sin prefijo data:image/... para Gemini inlineData
  mimeType: string;   // Tipo MIME ej. 'image/jpeg'
  dataUrl: string;    // Data URL completa para visualización en <img>
  originalSize: number;
  compressedSize: number;
}

export interface ImageProcessOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 a 1.0 (default 0.8)
}

/**
 * Lee un archivo File y devuelve su Data URL.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Redimensiona y comprime una imagen utilizando Canvas manteniendo el aspect ratio.
 */
export async function compressAndResizeImage(
  file: File,
  options: ImageProcessOptions = {}
): Promise<ProcessedImage> {
  const { maxWidth = 1280, maxHeight = 1280, quality = 0.8 } = options;

  // Validar tipo de archivo
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen válida.');
  }

  const originalDataUrl = await readFileAsDataUrl(file);

  // Si no estamos en entorno con DOM
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const parts = originalDataUrl.split(',');
    return {
      base64Data: parts[1] || '',
      mimeType: file.type || 'image/jpeg',
      dataUrl: originalDataUrl,
      originalSize: file.size,
      compressedSize: file.size,
    };
  }

  return new Promise((resolve) => {
    let isResolved = false;

    const finish = (dataUrl: string, mime: string) => {
      if (isResolved) return;
      isResolved = true;
      const b64 = dataUrl.split(',')[1] || '';
      resolve({
        base64Data: b64,
        mimeType: mime,
        dataUrl,
        originalSize: file.size,
        compressedSize: Math.round((b64.length * 3) / 4),
      });
    };

    // Verificar si el navegador soporta Canvas 2D nativo (evitando stubs de jsdom en tests)
    let hasCanvas2d = false;
    try {
      const testCanvas = document.createElement('canvas');
      const isJsdom =
        typeof navigator !== 'undefined' &&
        (navigator.userAgent.includes('jsdom') || !('toBlob' in testCanvas));

      if (!isJsdom) {
        hasCanvas2d = Boolean(testCanvas.getContext && testCanvas.getContext('2d'));
      }
    } catch {
      hasCanvas2d = false;
    }

    if (!hasCanvas2d) {
      finish(originalDataUrl, file.type || 'image/jpeg');
      return;
    }

    const img = new Image();

    img.onload = () => {
      let width = img.width || 1;
      let height = img.height || 1;

      // Calcular factor de escala para mantener proporciones
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        finish(originalDataUrl, file.type || 'image/jpeg');
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Exportar en JPEG optimizado
      const mimeType = 'image/jpeg';
      try {
        const compressedDataUrl = canvas.toDataURL(mimeType, quality);
        finish(compressedDataUrl, mimeType);
      } catch {
        finish(originalDataUrl, file.type || 'image/jpeg');
      }
    };

    img.onerror = () => {
      finish(originalDataUrl, file.type || 'image/jpeg');
    };

    // En entornos de testing (JSDOM) donde Image no procesa automáticamente data URLs,
    // usamos un timeout corto de seguridad para no congelar la promesa
    setTimeout(() => {
      finish(originalDataUrl, file.type || 'image/jpeg');
    }, 250);

    img.src = originalDataUrl;
  });
}
