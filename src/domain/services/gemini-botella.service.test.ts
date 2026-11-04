import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parsearRespuestaGemini,
  normalizarDatosInferidos,
  analizarFotoBotella,
} from './gemini-botella.service';

describe('gemini-botella.service', () => {
  describe('parsearRespuestaGemini', () => {
    it('parsea JSON plano directo', () => {
      const json = '{"nombre":"Fernet Branca","marca":"Branca"}';
      expect(parsearRespuestaGemini(json)).toEqual({
        nombre: 'Fernet Branca',
        marca: 'Branca',
      });
    });

    it('extrae JSON envuelto en bloques markdown ```json ... ```', () => {
      const raw = '```json\n{"nombre":"Campari","marca":"Campari","graduacionAlcoholica":28.5}\n```';
      expect(parsearRespuestaGemini(raw)).toEqual({
        nombre: 'Campari',
        marca: 'Campari',
        graduacionAlcoholica: 28.5,
      });
    });

    it('arroja error si el formato no es JSON', () => {
      expect(() => parsearRespuestaGemini('Esto no es un json')).toThrow();
    });
  });

  describe('normalizarDatosInferidos', () => {
    it('normaliza atributos válidos y mapea categoría disponible', () => {
      const raw = {
        esLegible: true,
        nombre: 'Aperol Spritz Aperitivo',
        marca: 'Aperol',
        categoriaSugerida: 'aperitivo',
        graduacionAlcoholica: 11.0,
        precioEstimado: 12500,
        volumenTotalMl: 750,
        notas: 'Licor de naranja y hierbas',
        confianza: 'alta',
      };

      const normalizado = normalizarDatosInferidos(raw, ['Destilado', 'Aperitivo / Bitter', 'Otro']);

      expect(normalizado).toEqual({
        nombre: 'Aperol Spritz Aperitivo',
        marca: 'Aperol',
        categoriaSugerida: 'Aperitivo / Bitter',
        graduacionAlcoholica: 11.0,
        precioEstimado: 12500,
        volumenTotalMl: 750,
        notas: 'Licor de naranja y hierbas',
        confianza: 'alta',
      });
    });

    it('devuelve null si esLegible es false o no hay nombre ni marca', () => {
      expect(normalizarDatosInferidos({ esLegible: false, nombre: 'Foto borrosa' })).toBeNull();
      expect(normalizarDatosInferidos({ esLegible: true, nombre: '', marca: '' })).toBeNull();
    });

    it('limita la graduación alcohólica entre 0 y 100', () => {
      const rawExcesivo = {
        esLegible: true,
        nombre: 'Whisky Fuerte',
        marca: 'Destilería',
        graduacionAlcoholica: 140,
      };
      const normalizado = normalizarDatosInferidos(rawExcesivo);
      expect(normalizado?.graduacionAlcoholica).toBe(100);
    });
  });

  describe('analizarFotoBotella', () => {
    const fakeImage = {
      base64Data: 'ZmFrZS1pbWFnZS1ieXRlcw==',
      mimeType: 'image/jpeg',
    };

    beforeEach(() => {
      localStorage.clear();
    });

    it('retorna error SIN_API_KEY si no hay clave configurada', async () => {
      const res = await analizarFotoBotella(fakeImage, { apiKey: '' });
      expect(res.exito).toBe(false);
      expect(res.codigoError).toBe('SIN_API_KEY');
      expect(res.error).toContain('No se configuró una Gemini API Key');
    });

    it('retorna ERROR_API ante credenciales inválidas (403)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden: API key not valid',
      });

      const res = await analizarFotoBotella(fakeImage, {
        apiKey: 'clave-invalida',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.exito).toBe(false);
      expect(res.codigoError).toBe('ERROR_API');
      expect(res.error).toContain('API Key de Gemini inválida');
    });

    it('retorna ERROR_API ante cuota excedida (429)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Resource exhausted',
      });

      const res = await analizarFotoBotella(fakeImage, {
        apiKey: 'clave-valida',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.exito).toBe(false);
      expect(res.codigoError).toBe('ERROR_API');
      expect(res.error).toContain('Cuota de Gemini excedida');
    });

    it('retorna ERROR_RED ante desconexión o fallo de red', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      const res = await analizarFotoBotella(fakeImage, {
        apiKey: 'clave-valida',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.exito).toBe(false);
      expect(res.codigoError).toBe('ERROR_RED');
      expect(res.error).toContain('Error de red o conexión');
    });

    it('retorna IMAGEN_ILEGIBLE si la IA no logra reconocer la botella', async () => {
      const fakeGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    esLegible: false,
                    nombre: '',
                    marca: '',
                  }),
                },
              ],
            },
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => fakeGeminiResponse,
      });

      const res = await analizarFotoBotella(fakeImage, {
        apiKey: 'clave-valida',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.exito).toBe(false);
      expect(res.codigoError).toBe('IMAGEN_ILEGIBLE');
      expect(res.error).toContain('No pudimos reconocer la etiqueta con claridad');
    });

    it('retorna éxito con datos inferidos y soporte de grounding de precios', async () => {
      const fakeGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    esLegible: true,
                    nombre: 'Gin Bombay Sapphire London Dry',
                    marca: 'Bombay Sapphire',
                    categoriaSugerida: 'Destilado',
                    graduacionAlcoholica: 47,
                    volumenTotalMl: 750,
                    precioEstimado: 24500,
                    confianza: 'alta',
                  }),
                },
              ],
            },
            groundingMetadata: {
              webSearchQueries: ['bombay sapphire 750ml precio argentina'],
            },
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => fakeGeminiResponse,
      });

      const res = await analizarFotoBotella(fakeImage, {
        apiKey: 'clave-valida',
        fetchFn: mockFetch as unknown as typeof fetch,
        categoriasDisponibles: ['Destilado', 'Aperitivo / Bitter'],
      });

      expect(res.exito).toBe(true);
      expect(res.datos?.nombre).toBe('Gin Bombay Sapphire London Dry');
      expect(res.datos?.marca).toBe('Bombay Sapphire');
      expect(res.datos?.categoriaSugerida).toBe('Destilado');
      expect(res.datos?.graduacionAlcoholica).toBe(47);
      expect(res.datos?.precioEstimado).toBe(24500);
      expect(res.fuentePrecios).toBe('Google Search');
    });

    it('si Google Search grounding retorna 400, reintenta sin tools y logra el análisis', async () => {
      const fakeSuccessWithoutGrounding = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    esLegible: true,
                    nombre: 'Vodka Absolut Regular',
                    marca: 'Absolut',
                    categoriaSugerida: 'Destilado',
                    graduacionAlcoholica: 40,
                    volumenTotalMl: 700,
                  }),
                },
              ],
            },
          },
        ],
      };

      let attempt = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        attempt++;
        if (attempt === 1) {
          // Primer intento con tools falla con 400
          return {
            ok: false,
            status: 400,
            text: async () => 'tools not supported on free tier',
          };
        }
        // Segundo intento sin tools tiene éxito
        return {
          ok: true,
          status: 200,
          json: async () => fakeSuccessWithoutGrounding,
        };
      });

      const res = await analizarFotoBotella(fakeImage, {
        apiKey: 'clave-valida',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.exito).toBe(true);
      expect(res.datos?.marca).toBe('Absolut');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

