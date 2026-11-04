import {
  DatosBotellaInferidos,
  ResultadoReconocimiento,
} from '../models/reconocimiento-botella';
import { getGeminiApiKey, getGeminiModel, setGeminiModel } from '../../infrastructure/ai/ai-config';

export const MODELOS_CANDIDATOS_FLASH = [
  'gemini-2.5-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-1.5-flash',
];

export interface AnalizarBotellaOptions {
  apiKey?: string;
  modelo?: string;
  categoriasDisponibles?: string[];
  fetchFn?: typeof fetch;
}

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Limpia y parsea la respuesta de texto devuelta por Gemini a un objeto JSON estructurado.
 */
export function parsearRespuestaGemini(rawText: string): Record<string, unknown> {
  const trimmed = rawText.trim();
  // Extraer contenido entre bloques ```json ... ``` si existen
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch ? jsonMatch[1].trim() : trimmed;

  try {
    return JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Respuesta no válida de la IA: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Normaliza y valida los datos extraídos de la respuesta JSON de Gemini.
 */
export function normalizarDatosInferidos(
  raw: Record<string, unknown>,
  categoriasDisponibles?: string[]
): DatosBotellaInferidos | null {
  const esLegible = raw.esLegible !== false;
  const nombre = typeof raw.nombre === 'string' ? raw.nombre.trim() : '';
  const marca = typeof raw.marca === 'string' ? raw.marca.trim() : '';

  // Si la etiqueta se marcó como ilegible o no se detectó ni nombre ni marca
  if (!esLegible || (!nombre && !marca)) {
    return null;
  }

  // Graduación alcohólica (0 a 100)
  let graduacionAlcoholica: number | undefined = undefined;
  if (typeof raw.graduacionAlcoholica === 'number' && !isNaN(raw.graduacionAlcoholica)) {
    graduacionAlcoholica = Math.min(100, Math.max(0, Number(raw.graduacionAlcoholica.toFixed(1))));
  }

  // Precio estimado
  let precioEstimado: number | undefined = undefined;
  if (typeof raw.precioEstimado === 'number' && !isNaN(raw.precioEstimado) && raw.precioEstimado > 0) {
    precioEstimado = Math.round(raw.precioEstimado);
  }

  // Volumen total en ml (ej. 750, 700, 1000)
  let volumenTotalMl: number | undefined = undefined;
  if (typeof raw.volumenTotalMl === 'number' && !isNaN(raw.volumenTotalMl) && raw.volumenTotalMl > 0) {
    volumenTotalMl = Math.round(raw.volumenTotalMl);
  }

  // Categoría sugerida (emparejar con las categorías disponibles si se suministraron)
  let categoriaSugerida: string | undefined = undefined;
  if (typeof raw.categoriaSugerida === 'string' && raw.categoriaSugerida.trim()) {
    const rawCat = raw.categoriaSugerida.trim().toLowerCase();
    if (categoriasDisponibles && categoriasDisponibles.length > 0) {
      const match = categoriasDisponibles.find(
        (c) => c.toLowerCase() === rawCat || rawCat.includes(c.toLowerCase()) || c.toLowerCase().includes(rawCat)
      );
      categoriaSugerida = match || raw.categoriaSugerida.trim();
    } else {
      categoriaSugerida = raw.categoriaSugerida.trim();
    }
  }

  const confianza =
    raw.confianza === 'alta' || raw.confianza === 'media' || raw.confianza === 'baja'
      ? raw.confianza
      : 'alta';

  const notas = typeof raw.notas === 'string' ? raw.notas.trim() : undefined;

  return {
    nombre: nombre || marca,
    marca: marca || nombre,
    categoriaSugerida,
    graduacionAlcoholica,
    precioEstimado,
    volumenTotalMl: volumenTotalMl || 750,
    notas,
    confianza,
  };
}

/**
 * Descubre dinámicamente qué modelos soportan generateContent para la API Key dada.
 */
async function descubrirModeloDisponible(
  apiKey: string,
  fetchClient: typeof fetch
): Promise<string | null> {
  try {
    const url = `${GEMINI_BASE_URL}/models?key=${encodeURIComponent(apiKey)}`;
    const res = await fetchClient(url);
    if (!res.ok) return null;
    const data = await res.json();
    const models = data?.models as Array<{ name?: string; supportedGenerationMethods?: string[] }> | undefined;
    if (!models || !Array.isArray(models)) return null;

    // Buscar modelos con soporte generateContent, priorizando nombres con "flash"
    const compatibles = models.filter(
      (m) =>
        m.supportedGenerationMethods?.includes('generateContent') &&
        typeof m.name === 'string'
    );

    const flashModel = compatibles.find((m) => m.name?.toLowerCase().includes('flash'));
    const elegido = flashModel || compatibles[0];
    if (elegido?.name) {
      return elegido.name.replace(/^models\//, '');
    }
  } catch {
    // Si falla la consulta a la lista de modelos
  }
  return null;
}

/**
 * Servicio principal de análisis multimodal de botellas mediante Google Gemini con fallback inteligente de modelos.
 */
export async function analizarFotoBotella(
  imagen: { base64Data: string; mimeType: string },
  options: AnalizarBotellaOptions = {}
): Promise<ResultadoReconocimiento> {
  const apiKey = options.apiKey || getGeminiApiKey();

  if (!apiKey) {
    return {
      exito: false,
      error: 'No se configuró una Gemini API Key. Ingresala en la configuración de la aplicación.',
      codigoError: 'SIN_API_KEY',
    };
  }

  const fetchClient = options.fetchFn || fetch;

  const promptTexto = `
Eres un sommelier experto y asistente de bar. Analiza la imagen adjunta correspondiente a una botella o bebida de bar.
Tu objetivo es identificar con precisión los atributos de la bebida y buscar o estimar su precio minorista de mercado de referencia.

Categorías registradas en este bar: ${
    options.categoriasDisponibles?.join(', ') || 'Destilado, Aperitivo / Bitter, Vino / Espumante, Cerveza, Licor, Mixer / Sin Alcohol, Otro'
  }.

Responde ESTRICTAMENTE un único objeto JSON válido con las siguientes claves:
{
  "esLegible": true/false (false si la foto no es una bebida o la etiqueta es totalmente ilegible/borrosa),
  "nombre": "Nombre comercial completo de la botella (ej: Bombay Sapphire London Dry Gin)",
  "marca": "Marca fabricante (ej: Bombay Sapphire)",
  "categoriaSugerida": "Una de las categorías del bar o el tipo de bebida más afín",
  "graduacionAlcoholica": 47.0 (número con el porcentaje de volumen alcohólico ABV, o null si no se visualiza ni infiere),
  "volumenTotalMl": 750 (capacidad en mililitros de la botella estándar, ej. 750, 700 o 1000),
  "precioEstimado": número con el precio minorista estimado de mercado de referencia en moneda local si se conoce, o null,
  "notas": "Breve nota de estilo, botánicos o características principales",
  "confianza": "alta" | "media" | "baja"
}
`.trim();

  // Función interna para realizar el fetch a un modelo específico
  const llamarGeminiConModelo = async (modelo: string, conGoogleSearch: boolean) => {
    const url = `${GEMINI_BASE_URL}/models/${modelo}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const bodyPayload: Record<string, unknown> = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: imagen.mimeType,
                data: imagen.base64Data,
              },
            },
            {
              text: promptTexto,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
      },
    };

    if (conGoogleSearch) {
      bodyPayload.tools = [{ googleSearch: {} }];
    }

    return await fetchClient(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });
  };

  // Construir lista ordenada de modelos a probar
  const modeloInicial = options.modelo || getGeminiModel();
  const modelosAProbar: string[] = [];

  if (modeloInicial && modeloInicial !== 'auto') {
    modelosAProbar.push(modeloInicial);
  }

  for (const m of MODELOS_CANDIDATOS_FLASH) {
    if (!modelosAProbar.includes(m)) {
      modelosAProbar.push(m);
    }
  }

  try {
    let ultimoErrorStatus: number | null = null;
    let ultimoErrorText = '';

    for (const modelo of modelosAProbar) {
      // Intento con Grounding de Google Search
      let response: Response;
      try {
        response = await llamarGeminiConModelo(modelo, true);
        if (!response.ok && response.status === 400) {
          // Reintentar sin grounding si el modelo/tier no soporta search tools
          response = await llamarGeminiConModelo(modelo, false);
        }
      } catch {
        response = await llamarGeminiConModelo(modelo, false);
      }

      if (response.status === 404) {
        // Modelo no encontrado en esta versión de API, probar siguiente candidato
        ultimoErrorStatus = 404;
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        if (response.status === 403 || response.status === 401) {
          return {
            exito: false,
            error: 'API Key de Gemini inválida o sin permisos suficientes.',
            codigoError: 'ERROR_API',
          };
        }
        if (response.status === 429) {
          return {
            exito: false,
            error: 'Cuota de Gemini excedida temporalmente. Intenta nuevamente en unos instantes.',
            codigoError: 'ERROR_API',
          };
        }
        ultimoErrorStatus = response.status;
        ultimoErrorText = errorText;
        continue;
      }

      // Si la respuesta fue exitosa:
      const data = await response.json();
      const candidate = data.candidates?.[0];
      const textPart = candidate?.content?.parts?.find((p: { text?: string }) => typeof p.text === 'string');

      if (!textPart?.text) {
        return {
          exito: false,
          error: 'No pudimos reconocer la etiqueta. No se recibió respuesta textual del modelo.',
          codigoError: 'IMAGEN_ILEGIBLE',
        };
      }

      let parsedJson: Record<string, unknown>;
      try {
        parsedJson = parsearRespuestaGemini(textPart.text);
      } catch {
        return {
          exito: false,
          error: 'No pudimos reconocer la etiqueta. La respuesta de la IA no tuvo el formato esperado.',
          codigoError: 'FORMATO_INVALIDO',
        };
      }

      const datosInferidos = normalizarDatosInferidos(parsedJson, options.categoriasDisponibles);

      if (!datosInferidos) {
        return {
          exito: false,
          error: 'No pudimos reconocer la etiqueta con claridad en la fotografía.',
          codigoError: 'IMAGEN_ILEGIBLE',
        };
      }

      // Guardar el modelo que funcionó para acelerar futuras llamadas
      setGeminiModel(modelo);

      return {
        exito: true,
        datos: datosInferidos,
        fuentePrecios: candidate.groundingMetadata?.webSearchQueries?.length ? 'Google Search' : undefined,
      };
    }

    // Si todos los candidatos dieron 404, intentar autodescubrimiento dinámico
    if (ultimoErrorStatus === 404) {
      const modeloDescubierto = await descubrirModeloDisponible(apiKey, fetchClient);
      if (modeloDescubierto && !modelosAProbar.includes(modeloDescubierto)) {
        let respDesc: Response;
        try {
          respDesc = await llamarGeminiConModelo(modeloDescubierto, false);
          if (respDesc.ok) {
            const dataDesc = await respDesc.json();
            const candDesc = dataDesc.candidates?.[0];
            const textDesc = candDesc?.content?.parts?.find((p: { text?: string }) => typeof p.text === 'string');
            if (textDesc?.text) {
              const parsed = parsearRespuestaGemini(textDesc.text);
              const inferidos = normalizarDatosInferidos(parsed, options.categoriasDisponibles);
              if (inferidos) {
                setGeminiModel(modeloDescubierto);
                return {
                  exito: true,
                  datos: inferidos,
                };
              }
            }
          }
        } catch {
          // continuar con mensaje de error final
        }
      }
    }

    return {
      exito: false,
      error: `Error del servicio de IA (${ultimoErrorStatus || 500}): ${ultimoErrorText.slice(0, 150) || 'No se encontró un modelo activo de Gemini en tu cuenta.'}`,
      codigoError: 'ERROR_API',
    };
  } catch (error) {
    return {
      exito: false,
      error:
        error instanceof Error
          ? `Error de red o conexión: ${error.message}`
          : 'Error de red o conexión al contactar a la IA.',
      codigoError: 'ERROR_RED',
    };
  }
}
