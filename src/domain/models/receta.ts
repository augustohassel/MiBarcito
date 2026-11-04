/**
 * Métodos de preparación admitidos en coctelería
 */
export type MetodoPreparacion =
  | 'batido'
  | 'refrescado'
  | 'directo'
  | 'licuado'
  | 'macerado'
  | 'otro';

/**
 * Clasificación del tipo de ingrediente:
 * - 'bebida': Botella o producto líquido que se consume de la despensa y posee volumen en ml.
 * - 'guarnicion_insumo': Ingrediente fresco o de almacén (hielo, frutas, hierbas, sal, etc.)
 *   que no descuenta stock en ml ni bloquea la preparación en "¿Qué puedo armar hoy?".
 */
export type TipoIngrediente = 'bebida' | 'guarnicion_insumo';

/**
 * Ingrediente requerido para la preparación de un cóctel
 */
export interface IngredienteReceta {
  nombre: string;
  cantidadMl?: number;
  unidad?: string;
  tipo: TipoIngrediente;
  opcional?: boolean;
  alternativas?: string[];
}

/**
 * Entidad de dominio: Trago / Cóctel (Receta)
 * Referencia: docs/glosario.md - Trago / Cóctel (Receta)
 */
export interface Receta {
  id: string;
  nombre: string;
  descripcion: string;
  ingredientes: IngredienteReceta[];
  cristaleria: string;
  metodoPreparacion: MetodoPreparacion;
  /**
   * Alias de conveniencia retrocompatible para metodoPreparacion
   */
  metodo?: MetodoPreparacion;
  pasos: string[];
  esFavorito: boolean;
  esPropia: boolean;
  tiempoMinutos?: number;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

/**
 * Alias para la entidad RecetaTrago según convención de Issue #5
 */
export type RecetaTrago = Receta;

/**
 * Errores de validación de una receta
 */
export type ErroresValidacionReceta = {
  nombre?: string;
  cristaleria?: string;
  metodoPreparacion?: string;
  ingredientes?: string;
  pasos?: string;
  general?: string;
};

/**
 * Valida los datos de una receta antes de crearla o editarla.
 */
export function validarReceta(datos: Partial<Receta>): ErroresValidacionReceta {
  const errores: ErroresValidacionReceta = {};

  if (!datos.nombre || datos.nombre.trim().length === 0) {
    errores.nombre = 'El nombre del cóctel es obligatorio';
  } else if (datos.nombre.trim().length < 2) {
    errores.nombre = 'El nombre debe tener al menos 2 caracteres';
  } else if (datos.nombre.trim().length > 80) {
    errores.nombre = 'El nombre no puede superar los 80 caracteres';
  }

  if (!datos.cristaleria || datos.cristaleria.trim().length === 0) {
    errores.cristaleria = 'La cristalería recomendada es obligatoria';
  }

  const metodo = datos.metodoPreparacion ?? datos.metodo;
  const metodosValidos: MetodoPreparacion[] = [
    'batido',
    'refrescado',
    'directo',
    'licuado',
    'macerado',
    'otro',
  ];
  if (!metodo || !metodosValidos.includes(metodo)) {
    errores.metodoPreparacion = 'Debe seleccionar un método de preparación válido';
  }

  if (!datos.ingredientes || datos.ingredientes.length === 0) {
    errores.ingredientes = 'La receta debe contener al menos un ingrediente';
  } else {
    const bebidas = datos.ingredientes.filter((i) => i.tipo === 'bebida');
    if (bebidas.length === 0) {
      errores.ingredientes = 'La receta debe incluir al menos un ingrediente de tipo bebida';
    } else {
      const ingredienteInvalido = datos.ingredientes.find((ing) => {
        if (!ing.nombre || ing.nombre.trim().length === 0) return true;
        if (ing.tipo === 'bebida') {
          return !ing.cantidadMl || ing.cantidadMl <= 0 || ing.cantidadMl > 2000;
        }
        return false;
      });
      if (ingredienteInvalido) {
        errores.ingredientes =
          'Todos los ingredientes deben tener nombre y las bebidas una cantidad en ml válida (mayor a 0 y menor a 2000 ml)';
      }
    }
  }

  if (!datos.pasos || datos.pasos.length === 0) {
    errores.pasos = 'Debe indicar al menos un paso de preparación';
  } else {
    const algunPasoVacio = datos.pasos.some((p) => !p || p.trim().length === 0);
    if (algunPasoVacio) {
      errores.pasos = 'Los pasos de preparación no pueden estar vacíos';
    }
  }

  return errores;
}

/**
 * Clona una receta del catálogo estándar o propia para generar una nueva receta de autor
 */
export function clonarRecetaParaAutor(receta: Receta, nuevoNombre?: string): Receta {
  const timestamp = new Date().toISOString();
  return {
    ...receta,
    id: `receta-propia-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    nombre: nuevoNombre ?? `${receta.nombre} (Copia)`,
    esPropia: true,
    esFavorito: false,
    ingredientes: receta.ingredientes.map((ing) => ({
      ...ing,
      alternativas: ing.alternativas ? [...ing.alternativas] : undefined,
    })),
    pasos: [...receta.pasos],
    fechaCreacion: timestamp,
    fechaActualizacion: timestamp,
  };
}

/**
 * Catálogo base de cócteles clásicos predeterminados (solo lectura del sistema)
 */
export const RECETAS_PREDETERMINADAS: Receta[] = [
  {
    id: 'receta-negroni',
    nombre: 'Negroni',
    descripcion: 'Clásico cóctel italiano de aperitivo, equilibrado, aromático y con notas amargas elegantes.',
    cristaleria: 'Vaso Old Fashioned (on the rocks)',
    metodoPreparacion: 'refrescado',
    metodo: 'refrescado',
    esFavorito: false,
    esPropia: false,
    ingredientes: [
      { nombre: 'Gin', cantidadMl: 30, unidad: 'ml', tipo: 'bebida', alternativas: ['London Dry', 'Ginebra'] },
      { nombre: 'Campari', cantidadMl: 30, unidad: 'ml', tipo: 'bebida', alternativas: ['Bitter Rojo'] },
      { nombre: 'Vermut Rosso', cantidadMl: 30, unidad: 'ml', tipo: 'bebida', alternativas: ['Vermut Rosso', 'Vermouth Rosso', 'Vermouth', 'Rosso'] },
      { nombre: 'Hielo en cubos', tipo: 'guarnicion_insumo', opcional: false },
      { nombre: 'Media rodaja o piel de naranja', tipo: 'guarnicion_insumo', opcional: true },
    ],
    pasos: [
      'Llenar un vaso de composición o el vaso bajo con abundante hielo cristalino.',
      'Verter partes iguales de Gin, Campari y Vermut Rosso.',
      'Remover suavemente con cuchara de bar durante 20 a 30 segundos.',
      'Decorar con media rodaja o piel de naranja aromatizando el borde.',
    ],
  },
  {
    id: 'receta-gin-tonic',
    nombre: 'Gin Tonic',
    descripcion: 'Bebida refrescante y chispeante por excelencia, con burbuja fina y toque botánico.',
    cristaleria: 'Copa balón o vaso Highball',
    metodoPreparacion: 'directo',
    metodo: 'directo',
    esFavorito: false,
    esPropia: false,
    ingredientes: [
      { nombre: 'Gin', cantidadMl: 50, unidad: 'ml', tipo: 'bebida', alternativas: ['London Dry', 'Ginebra'] },
      { nombre: 'Agua Tónica', cantidadMl: 150, unidad: 'ml', tipo: 'bebida', alternativas: ['Tonica', 'Tónica', 'Indian Tonic'] },
      { nombre: 'Hielo en rocas', tipo: 'guarnicion_insumo', opcional: false },
      { nombre: 'Rodaja de limón o pepino', tipo: 'guarnicion_insumo', opcional: true },
    ],
    pasos: [
      'Llenar la copa balón con hielo hasta el borde y enfriar la copa haciendo girar los hielos.',
      'Descartar el agua residual.',
      'Agregar 50 ml de Gin.',
      'Verter suavemente el agua tónica fría sobre la cuchara de bar para preservar la burbuja.',
      'Integrar con un solo movimiento vertical y decorar con rodaja cítrica.',
    ],
  },
  {
    id: 'receta-aperol-spritz',
    nombre: 'Aperol Spritz',
    descripcion: 'El aperitivo veneciano más popular, vibrante, burbujeante y de bajo tenor alcohólico.',
    cristaleria: 'Copa de vino amplia',
    metodoPreparacion: 'directo',
    metodo: 'directo',
    esFavorito: false,
    esPropia: false,
    ingredientes: [
      { nombre: 'Vino Espumante', cantidadMl: 90, unidad: 'ml', tipo: 'bebida', alternativas: ['Prosecco', 'Champagne', 'Espumante'] },
      { nombre: 'Aperol', cantidadMl: 60, unidad: 'ml', tipo: 'bebida', alternativas: ['Aperitivo Cítrico', 'Bitter Naranja'] },
      { nombre: 'Soda', cantidadMl: 30, unidad: 'ml', tipo: 'bebida', alternativas: ['Agua con gas', 'Club Soda', 'Sifón'] },
      { nombre: 'Hielo', tipo: 'guarnicion_insumo', opcional: false },
      { nombre: 'Rodaja de naranja fresca', tipo: 'guarnicion_insumo', opcional: true },
    ],
    pasos: [
      'Llenar la copa con hielo abundante.',
      'Verter 90 ml de espumante o Prosecco.',
      'Incorporar 60 ml de Aperol en círculos para favorecer la mezcla.',
      'Completar con un toque de soda (30 ml) y decorar con una rodaja de naranja.',
    ],
  },
  {
    id: 'receta-fernet-cola',
    nombre: 'Fernet con Cola',
    descripcion: 'Emblema indiscutido de la cultura popular argentina, amargo, espumoso y refrescante.',
    cristaleria: 'Vaso de trago largo (Highball) o vaso alto',
    metodoPreparacion: 'directo',
    metodo: 'directo',
    esFavorito: false,
    esPropia: false,
    ingredientes: [
      { nombre: 'Fernet', cantidadMl: 50, unidad: 'ml', tipo: 'bebida', alternativas: ['Fernet Branca', 'Amaro'] },
      { nombre: 'Bebida Cola', cantidadMl: 150, unidad: 'ml', tipo: 'bebida', alternativas: ['Coca Cola', 'Pepsi', 'Gaseosa Cola', 'Cola'] },
      { nombre: 'Hielo en cubos', tipo: 'guarnicion_insumo', opcional: false },
    ],
    pasos: [
      'Colocar abundante hielo hasta completar el vaso.',
      'Servir el Fernet en proporción clásica (aproximadamente 30% a 40% del vaso).',
      'Inclinar el vaso y verter lentamente la bebida cola para generar una corona de espuma densa y cremosa.',
      'Remover suavemente una sola vez.',
    ],
  },
  {
    id: 'receta-old-fashioned',
    nombre: 'Old Fashioned',
    descripcion: 'El padre de la coctelería moderna: whisky realzado con azúcar, bitter y aceites de cítrico.',
    cristaleria: 'Vaso Old Fashioned bajo y pesado',
    metodoPreparacion: 'directo',
    metodo: 'directo',
    esFavorito: false,
    esPropia: false,
    ingredientes: [
      { nombre: 'Whisky', cantidadMl: 50, unidad: 'ml', tipo: 'bebida', alternativas: ['Bourbon', 'Rye', 'Scotch', 'Whiskey'] },
      { nombre: 'Bitter Angostura', cantidadMl: 5, unidad: 'ml', tipo: 'bebida', alternativas: ['Angostura', 'Aromatic Bitter'] },
      { nombre: 'Terrón de azúcar o syrup', tipo: 'guarnicion_insumo', opcional: false },
      { nombre: 'Piel de naranja', tipo: 'guarnicion_insumo', opcional: true },
    ],
    pasos: [
      'En el vaso bajo, impregnar el azúcar con las gotas de bitter aromático y un toque mínimo de agua.',
      'Disolver el azúcar con el mortero hasta formar una pasta suave.',
      'Agregar un cubo de hielo grande y la mitad del whisky. Remover.',
      'Agregar el resto del whisky y continuar enfriando hasta alcanzar la dilución perfecta.',
      'Exprimir la piel de naranja sobre la superficie para liberar sus aceites esenciales.',
    ],
  },
  {
    id: 'receta-margarita',
    nombre: 'Margarita',
    descripcion: 'Insuperable balance entre el carácter agave del tequila, el dulzor cítrico del licor de naranja y la lima.',
    cristaleria: 'Copa Margarita o Copa Coupé',
    metodoPreparacion: 'batido',
    metodo: 'batido',
    esFavorito: false,
    esPropia: false,
    ingredientes: [
      { nombre: 'Tequila', cantidadMl: 50, unidad: 'ml', tipo: 'bebida', alternativas: ['Mezcal'] },
      { nombre: 'Licor de Naranja', cantidadMl: 25, unidad: 'ml', tipo: 'bebida', alternativas: ['Triple Sec', 'Cointreau', 'Curacao'] },
      { nombre: 'Jugo de Lima fresca', cantidadMl: 25, unidad: 'ml', tipo: 'bebida', alternativas: ['Jugo de Lima', 'Jugo de Limon', 'Lima'] },
      { nombre: 'Sal fina para coronar', tipo: 'guarnicion_insumo', opcional: true },
      { nombre: 'Hielo para batir', tipo: 'guarnicion_insumo', opcional: false },
    ],
    pasos: [
      'Pasar una rodaja de lima por el borde de la copa y pasarla por un plato con sal fina (escarchado parcial).',
      'En una coctelera con hielo, verter el Tequila, el Licor de Naranja y el jugo de lima fresco.',
      'Batir enérgicamente durante 12 a 15 segundos hasta que la coctelera esté escarchada.',
      'Colar finamente sobre la copa enfriada.',
    ],
  },
  {
    id: 'receta-mojito',
    nombre: 'Mojito',
    descripcion: 'Clásico cubano refrescante a base de ron blanco, menta fresca machacada y lima.',
    cristaleria: 'Vaso Highball (tubo)',
    metodoPreparacion: 'macerado',
    metodo: 'macerado',
    esFavorito: false,
    esPropia: false,
    ingredientes: [
      { nombre: 'Ron Blanco', cantidadMl: 50, unidad: 'ml', tipo: 'bebida', alternativas: ['Ron', 'Rum'] },
      { nombre: 'Soda', cantidadMl: 50, unidad: 'ml', tipo: 'bebida', alternativas: ['Agua con gas', 'Club Soda', 'Sifón'] },
      { nombre: 'Ramas de menta fresca', tipo: 'guarnicion_insumo', opcional: false },
      { nombre: 'Jugo de lima fresco', cantidadMl: 20, unidad: 'ml', tipo: 'bebida', opcional: false, alternativas: ['Lima', 'Jugo de Limon', 'Jugo de Lima'] },
      { nombre: 'Azúcar blanco', tipo: 'guarnicion_insumo', opcional: false },
      { nombre: 'Hielo picado', tipo: 'guarnicion_insumo', opcional: false },
    ],
    pasos: [
      'En el vaso alto, colocar 2 cucharaditas de azúcar y las ramas de menta con el jugo de lima.',
      'Presionar suavemente con el mortero para liberar los aromas sin romper las hojas.',
      'Agregar el Ron Blanco y llenar el vaso con hielo picado hasta 3/4 partes.',
      'Remover bien para integrar y enfriar.',
      'Completar con soda fría y decorar con un penacho de menta y rodaja de lima.',
    ],
  },
  {
    id: 'receta-manhattan',
    nombre: 'Manhattan',
    descripcion: 'Sofisticado cóctel neoyorquino que combina whisky americano y vermut dulce con notas especiadas.',
    cristaleria: 'Copa Cocktail / Martini',
    metodoPreparacion: 'refrescado',
    metodo: 'refrescado',
    esFavorito: false,
    esPropia: false,
    ingredientes: [
      { nombre: 'Whisky', cantidadMl: 50, unidad: 'ml', tipo: 'bebida', alternativas: ['Rye', 'Bourbon', 'Scotch', 'Whiskey'] },
      { nombre: 'Vermut Rosso', cantidadMl: 25, unidad: 'ml', tipo: 'bebida', alternativas: ['Vermut Rosso', 'Vermouth Rosso', 'Vermouth', 'Rosso'] },
      { nombre: 'Bitter Angostura', cantidadMl: 5, unidad: 'ml', tipo: 'bebida', alternativas: ['Angostura', 'Aromatic Bitter'] },
      { nombre: 'Hielo para refrescar', tipo: 'guarnicion_insumo', opcional: false },
      { nombre: 'Cereza al marrasquino', tipo: 'guarnicion_insumo', opcional: true },
    ],
    pasos: [
      'En el vaso de composición con hielo, agregar el Whisky, el Vermut Rosso y las gotas de Bitter.',
      'Refrescar con la cuchara de bar durante unos 25 segundos.',
      'Colar en la copa previamente enfriada.',
      'Decorar con una cereza marrasquino en el fondo.',
    ],
  },
  {
    id: 'receta-dry-martini',
    nombre: 'Dry Martini',
    descripcion: 'El rey de los cócteles secos, destilado puro aromatizado con toque botánico de vermut extra seco.',
    cristaleria: 'Copa Martini clásica',
    metodoPreparacion: 'refrescado',
    metodo: 'refrescado',
    esFavorito: false,
    esPropia: false,
    ingredientes: [
      { nombre: 'Gin', cantidadMl: 60, unidad: 'ml', tipo: 'bebida', alternativas: ['London Dry', 'Ginebra'] },
      { nombre: 'Vermut Dry', cantidadMl: 10, unidad: 'ml', tipo: 'bebida', alternativas: ['Vermut Extra Dry', 'Vermut Seco', 'Vermouth Dry', 'French Vermouth'] },
      { nombre: 'Hielo para refrescar', tipo: 'guarnicion_insumo', opcional: false },
      { nombre: 'Aceituna verde o piel de limón', tipo: 'guarnicion_insumo', opcional: true },
    ],
    pasos: [
      'Enfriar la copa martini con hielo mientras se prepara el cóctel.',
      'En el vaso mezclador con hielo abundante, verter el Gin y el Vermut Dry.',
      'Refrescar enérgicamente durante 30 segundos hasta alcanzar temperatura gélida.',
      'Descartar el hielo de la copa y colar el cóctel.',
      'Decorar con una aceituna verde pinchada o un twist de limón.',
    ],
  },
  {
    id: 'receta-cuba-libre',
    nombre: 'Cuba Libre',
    descripcion: 'Combinación legendaria de ron dorado o blanco, bebida cola y lima fresca.',
    cristaleria: 'Vaso Highball',
    metodoPreparacion: 'directo',
    metodo: 'directo',
    esFavorito: false,
    esPropia: false,
    ingredientes: [
      { nombre: 'Ron', cantidadMl: 50, unidad: 'ml', tipo: 'bebida', alternativas: ['Ron Dorado', 'Ron Blanco', 'Rum'] },
      { nombre: 'Bebida Cola', cantidadMl: 120, unidad: 'ml', tipo: 'bebida', alternativas: ['Coca Cola', 'Pepsi', 'Gaseosa Cola', 'Cola'] },
      { nombre: 'Jugo de Lima fresca', cantidadMl: 10, unidad: 'ml', tipo: 'bebida', opcional: true, alternativas: ['Jugo de Lima', 'Jugo de Limon', 'Lima'] },
      { nombre: 'Hielo', tipo: 'guarnicion_insumo', opcional: false },
      { nombre: 'Rodaja de lima', tipo: 'guarnicion_insumo', opcional: true },
    ],
    pasos: [
      'Llenar el vaso con hielo fresco.',
      'Verter 50 ml de ron y 10 ml de jugo de lima exprimido en el momento.',
      'Completar con gaseosa cola fría.',
      'Remover suavemente con la cuchara y decorar con una rodaja de lima.',
    ],
  },
];
