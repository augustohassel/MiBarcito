import { describe, it, expect } from 'vitest';
import {
  readFileAsDataUrl,
  compressAndResizeImage,
} from './image-processor';

describe('image-processor - Compresión y redimensionamiento de imágenes', () => {
  it('readFileAsDataUrl lee un archivo y retorna un data URL válido', async () => {
    const file = new File(['fake-image-bytes'], 'botella.jpg', { type: 'image/jpeg' });
    const dataUrl = await readFileAsDataUrl(file);

    expect(dataUrl).toContain('data:image/jpeg;base64,');
  });

  it('rechaza archivos que no son imágenes', async () => {
    const textFile = new File(['texto plano'], 'nota.txt', { type: 'text/plain' });
    await expect(compressAndResizeImage(textFile)).rejects.toThrow(
      'El archivo seleccionado no es una imagen válida.'
    );
  });

  it('procesa y devuelve base64Data, mimeType y dataUrl para una imagen válida', async () => {
    const file = new File(['fake-image-bytes'], 'gin.png', { type: 'image/png' });
    const processed = await compressAndResizeImage(file, { maxWidth: 800, maxHeight: 800 });

    expect(processed).toBeDefined();
    expect(processed.base64Data).toBeDefined();
    expect(typeof processed.base64Data).toBe('string');
    expect(processed.mimeType).toBeDefined();
    expect(processed.dataUrl).toContain('data:image/');
    expect(processed.originalSize).toBe(file.size);
  });
});

