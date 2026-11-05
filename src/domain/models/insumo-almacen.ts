/**
 * Categorías de insumos y guarniciones del Almacén
 */
export type CategoriaInsumo =
  | 'hielo'
  | 'citricos_frutas'
  | 'hierbas_especias'
  | 'encurtidos_decoracion'
  | 'endulzantes_sales'
  | 'otro_insumo';

export const CATEGORIAS_INSUMO: { value: CategoriaInsumo; label: string; icono: string }[] = [
  { value: 'hielo', label: 'Hielo', icono: '🧊' },
  { value: 'citricos_frutas', label: 'Cítricos y Frutas', icono: '🍋' },
  { value: 'hierbas_especias', label: 'Hierbas y Especias', icono: '🌿' },
  { value: 'encurtidos_decoracion', label: 'Encurtidos y Decoración', icono: '🫒' },
  { value: 'endulzantes_sales', label: 'Endulzantes y Sales', icono: '🧂' },
  { value: 'otro_insumo', label: 'Otros Insumos', icono: '✨' },
];

/**
 * Entidad de dominio: Insumo o Guarnición del Almacén
 * Controla la disponibilidad ("Tengo / No tengo") de guarniciones e insumos no embotellados.
 */
export interface InsumoAlmacen {
  id: string;
  nombre: string;
  categoria: CategoriaInsumo;
  disponible: boolean;
  esPredeterminado: boolean;
  aliases?: string[];
  fechaCreacion: string;
  fechaActualizacion: string;
}

const FECHA_BASE = '2026-11-04T00:00:00.000Z';

/**
 * Catálogo base pre-sembrado de insumos y guarniciones de coctelería.
 * Los insumos básicos de cocina (hielo, azúcar, sal) inician disponibles;
 * los perecederos o específicos (aceitunas, cerezas, menta, cítricos) inician en false
 * para no mostrar falsos positivos hasta que el usuario indique que los tiene.
 */
export const INSUMOS_PREDETERMINADOS: InsumoAlmacen[] = [
  {
    id: 'insumo-hielo',
    nombre: 'Hielo',
    categoria: 'hielo',
    disponible: true,
    esPredeterminado: true,
    aliases: [
      'Hielo en cubos',
      'Hielo en rocas',
      'Hielo picado',
      'Hielo para batir',
      'Hielo para refrescar',
    ],
    fechaCreacion: FECHA_BASE,
    fechaActualizacion: FECHA_BASE,
  },
  {
    id: 'insumo-naranja',
    nombre: 'Naranja (rodaja o piel)',
    categoria: 'citricos_frutas',
    disponible: false,
    esPredeterminado: true,
    aliases: [
      'Media rodaja o piel de naranja',
      'Rodaja de naranja fresca',
      'Piel de naranja',
      'Rodaja de naranja',
      'Naranja',
    ],
    fechaCreacion: FECHA_BASE,
    fechaActualizacion: FECHA_BASE,
  },
  {
    id: 'insumo-limon',
    nombre: 'Limón (rodaja o piel)',
    categoria: 'citricos_frutas',
    disponible: false,
    esPredeterminado: true,
    aliases: ['Rodaja de limón o pepino', 'Rodaja de limón', 'Piel de limón', 'Limón'],
    fechaCreacion: FECHA_BASE,
    fechaActualizacion: FECHA_BASE,
  },
  {
    id: 'insumo-lima',
    nombre: 'Lima (rodaja)',
    categoria: 'citricos_frutas',
    disponible: false,
    esPredeterminado: true,
    aliases: ['Rodaja de lima', 'Lima fresca', 'Lima'],
    fechaCreacion: FECHA_BASE,
    fechaActualizacion: FECHA_BASE,
  },
  {
    id: 'insumo-pepino',
    nombre: 'Pepino',
    categoria: 'citricos_frutas',
    disponible: false,
    esPredeterminado: true,
    aliases: ['Rodaja de pepino'],
    fechaCreacion: FECHA_BASE,
    fechaActualizacion: FECHA_BASE,
  },
  {
    id: 'insumo-menta',
    nombre: 'Menta fresca',
    categoria: 'hierbas_especias',
    disponible: false,
    esPredeterminado: true,
    aliases: ['Ramas de menta fresca', 'Hojas de menta', 'Menta', 'Hierbabuena'],
    fechaCreacion: FECHA_BASE,
    fechaActualizacion: FECHA_BASE,
  },
  {
    id: 'insumo-romero',
    nombre: 'Romero fresco',
    categoria: 'hierbas_especias',
    disponible: false,
    esPredeterminado: true,
    aliases: ['Rama de romero', 'Romero'],
    fechaCreacion: FECHA_BASE,
    fechaActualizacion: FECHA_BASE,
  },
  {
    id: 'insumo-aceituna',
    nombre: 'Aceitunas verdes',
    categoria: 'encurtidos_decoracion',
    disponible: false,
    esPredeterminado: true,
    aliases: ['Aceituna verde o piel de limón', 'Aceituna verde', 'Aceitunas'],
    fechaCreacion: FECHA_BASE,
    fechaActualizacion: FECHA_BASE,
  },
  {
    id: 'insumo-cereza',
    nombre: 'Cerezas al marrasquino',
    categoria: 'encurtidos_decoracion',
    disponible: false,
    esPredeterminado: true,
    aliases: ['Cereza al marrasquino', 'Cereza marrasquino', 'Cereza'],
    fechaCreacion: FECHA_BASE,
    fechaActualizacion: FECHA_BASE,
  },
  {
    id: 'insumo-azucar',
    nombre: 'Azúcar',
    categoria: 'endulzantes_sales',
    disponible: true,
    esPredeterminado: true,
    aliases: ['Terrón de azúcar o syrup', 'Azúcar blanco', 'Terrón de azúcar'],
    fechaCreacion: FECHA_BASE,
    fechaActualizacion: FECHA_BASE,
  },
  {
    id: 'insumo-sal',
    nombre: 'Sal fina',
    categoria: 'endulzantes_sales',
    disponible: true,
    esPredeterminado: true,
    aliases: ['Sal fina para coronar', 'Sal'],
    fechaCreacion: FECHA_BASE,
    fechaActualizacion: FECHA_BASE,
  },
];

export function obtenerLabelCategoriaInsumo(categoria: CategoriaInsumo): string {
  return CATEGORIAS_INSUMO.find((c) => c.value === categoria)?.label ?? 'Otros Insumos';
}

export function obtenerIconoCategoriaInsumo(categoria: CategoriaInsumo): string {
  return CATEGORIAS_INSUMO.find((c) => c.value === categoria)?.icono ?? '✨';
}

