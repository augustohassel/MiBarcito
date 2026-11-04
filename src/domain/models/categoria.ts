/**
 * Identificador constante de la categoría comodín del sistema.
 * Es inmutable y no puede ser eliminada bajo ninguna circunstancia.
 */
export const CATEGORIA_COMODIN_ID = 'otro';

/**
 * Entidad de dominio: Categoría de Bebida
 * Permite clasificar y organizar las botellas en la despensa de forma dinámica.
 */
export interface Categoria {
  id: string;
  nombre: string;
  esPredeterminada: boolean;
  orden: number;
  subcategorias?: string[];
  fechaCreacion: string;
  fechaActualizacion: string;
}

/**
 * Categorías base predeterminadas sembradas al iniciar el sistema.
 * Conservan los slugs históricos para garantizar total retrocompatibilidad con las bebidas existentes.
 */
export const CATEGORIAS_PREDETERMINADAS: Categoria[] = [
  {
    id: 'destilado',
    nombre: 'Destilado',
    esPredeterminada: true,
    orden: 1,
    subcategorias: ['Gin', 'Vodka', 'Ron', 'Tequila', 'Whisky', 'Pisco', 'Brandy'],
    fechaCreacion: '2026-11-03T00:00:00.000Z',
    fechaActualizacion: '2026-11-03T00:00:00.000Z',
  },
  {
    id: 'licor',
    nombre: 'Licor',
    esPredeterminada: true,
    orden: 2,
    subcategorias: ['Triple Sec / Naranja', 'Café', 'Crema', 'Amaretto', 'Frutales', 'Herbal'],
    fechaCreacion: '2026-11-03T00:00:00.000Z',
    fechaActualizacion: '2026-11-03T00:00:00.000Z',
  },
  {
    id: 'vino',
    nombre: 'Vino',
    esPredeterminada: true,
    orden: 3,
    subcategorias: ['Tinto', 'Blanco', 'Rosado', 'Espumante'],
    fechaCreacion: '2026-11-03T00:00:00.000Z',
    fechaActualizacion: '2026-11-03T00:00:00.000Z',
  },
  {
    id: 'cerveza',
    nombre: 'Cerveza',
    esPredeterminada: true,
    orden: 4,
    subcategorias: ['Rubia / Lager', 'IPA / APA', 'Negra / Stout', 'Roja', 'Trigo'],
    fechaCreacion: '2026-11-03T00:00:00.000Z',
    fechaActualizacion: '2026-11-03T00:00:00.000Z',
  },
  {
    id: 'aperitivo_bitter',
    nombre: 'Aperitivo / Bitter',
    esPredeterminada: true,
    orden: 5,
    subcategorias: ['Bitter Rojo', 'Fernet', 'Vermut Rosso', 'Vermut Dry', 'Aperitivo Cítrico'],
    fechaCreacion: '2026-11-03T00:00:00.000Z',
    fechaActualizacion: '2026-11-03T00:00:00.000Z',
  },
  {
    id: 'mixer_sin_alcohol',
    nombre: 'Mixer sin Alcohol',
    esPredeterminada: true,
    orden: 6,
    subcategorias: ['Tónica', 'Cola', 'Soda / Agua con gas', 'Jugo Cítrico', 'Ginger Ale'],
    fechaCreacion: '2026-11-03T00:00:00.000Z',
    fechaActualizacion: '2026-11-03T00:00:00.000Z',
  },
  {
    id: 'syrup_endulzante',
    nombre: 'Syrup / Endulzante',
    esPredeterminada: true,
    orden: 7,
    subcategorias: ['Simple', 'Frutales', 'Miel', 'Especiado'],
    fechaCreacion: '2026-11-03T00:00:00.000Z',
    fechaActualizacion: '2026-11-03T00:00:00.000Z',
  },
  {
    id: CATEGORIA_COMODIN_ID,
    nombre: 'Otro',
    esPredeterminada: true,
    orden: 8,
    subcategorias: [],
    fechaCreacion: '2026-11-03T00:00:00.000Z',
    fechaActualizacion: '2026-11-03T00:00:00.000Z',
  },
];

/**
 * Errores de validación de una categoría
 */
export type ErroresValidacionCategoria = {
  nombre?: string;
  general?: string;
};

/**
 * Normaliza una cadena de texto para comparaciones seguras (minúsculas, trim y sin espacios múltiples)
 */
export function normalizarNombreCategoria(nombre: string): string {
  return nombre.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Valida los datos de una categoría antes de crearla o editarla.
 * Aplica reglas de nombre obligatorio, longitud y no duplicidad (case-insensitive).
 */
export function validarCategoria(
  datos: Partial<Categoria>,
  categoriasExistentes: Categoria[] = []
): ErroresValidacionCategoria {
  const errores: ErroresValidacionCategoria = {};

  if (!datos.nombre || datos.nombre.trim().length === 0) {
    errores.nombre = 'El nombre de la categoría es obligatorio';
    return errores;
  }

  const nombreLimpio = datos.nombre.trim();
  if (nombreLimpio.length < 2) {
    errores.nombre = 'El nombre de la categoría debe tener al menos 2 caracteres';
    return errores;
  }

  if (nombreLimpio.length > 50) {
    errores.nombre = 'El nombre de la categoría no puede superar los 50 caracteres';
    return errores;
  }

  const nombreNormalizado = normalizarNombreCategoria(nombreLimpio);
  const esDuplicado = categoriasExistentes.some(
    (cat) => cat.id !== datos.id && normalizarNombreCategoria(cat.nombre) === nombreNormalizado
  );

  if (esDuplicado) {
    errores.nombre = 'Ya existe una categoría con este nombre';
  }

  return errores;
}

/**
 * Valida un nombre de subcategoría para agregarla o editarla dentro de una categoría.
 * Reglas: obligatorio, entre 2 y 50 caracteres, y no duplicada (case-insensitive) dentro de la categoría.
 */
export function validarSubcategoria(
  nombre: string,
  subcategoriasExistentes: string[] = []
): { valido: boolean; error?: string } {
  if (!nombre || nombre.trim().length === 0) {
    return { valido: false, error: 'El nombre de la subcategoría es obligatorio' };
  }

  const nombreLimpio = nombre.trim();
  if (nombreLimpio.length < 2) {
    return { valido: false, error: 'El nombre de la subcategoría debe tener al menos 2 caracteres' };
  }

  if (nombreLimpio.length > 50) {
    return { valido: false, error: 'El nombre de la subcategoría no puede superar los 50 caracteres' };
  }

  const normalizado = normalizarNombreCategoria(nombreLimpio);
  const esDuplicado = subcategoriasExistentes.some(
    (s) => normalizarNombreCategoria(s) === normalizado
  );

  if (esDuplicado) {
    return { valido: false, error: 'Ya existe esta subcategoría en la categoría' };
  }

  return { valido: true };
}

/**
 * Verifica si una categoría puede ser eliminada.
 * Reglas de negocio:
 * 1. La categoría 'otro' nunca puede ser eliminada (categoría comodín).
 * 2. Ninguna categoría puede eliminarse si tiene bebidas asociadas en la despensa.
 */
export function puedeEliminarCategoria(
  categoriaId: string,
  cantidadBebidasAsociadas: number
): { puede: boolean; motivo?: string } {
  if (categoriaId === CATEGORIA_COMODIN_ID) {
    return {
      puede: false,
      motivo: "La categoría 'Otro' es el comodín reservado del sistema y no puede eliminarse.",
    };
  }

  if (cantidadBebidasAsociadas > 0) {
    return {
      puede: false,
      motivo: `No se puede eliminar la categoría porque tiene ${cantidadBebidasAsociadas} bebida(s) asignada(s). Reasigne o elimine dichas bebidas previamente.`,
    };
  }

  return { puede: true };
}

