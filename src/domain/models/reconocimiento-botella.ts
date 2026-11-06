/**
 * Modelos y tipos de datos para el reconocimiento asistido por IA multimodal de botellas.
 */

export interface DatosBotellaInferidos {
  nombre: string;
  marca: string;
  categoriaSugerida?: string;
  subcategoriaSugerida?: string;
  graduacionAlcoholica?: number; // 0 - 100
  precioEstimado?: number;       // precio de mercado sugerido
  volumenTotalMl?: number;      // ej: 750, 700, 1000
  notas?: string;               // descripción o estilo
  confianza?: 'alta' | 'media' | 'baja';
}

export type CodigoErrorReconocimiento =
  | 'SIN_API_KEY'
  | 'IMAGEN_ILEGIBLE'
  | 'ERROR_RED'
  | 'ERROR_API'
  | 'FORMATO_INVALIDO';

export interface ResultadoReconocimiento {
  exito: boolean;
  datos?: DatosBotellaInferidos;
  error?: string;
  codigoError?: CodigoErrorReconocimiento;
  fuentePrecios?: string;
}

