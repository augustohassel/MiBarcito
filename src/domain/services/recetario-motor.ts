import { Bebida } from '../models/bebida';
import { IngredienteReceta, Receta } from '../models/receta';
import { InsumoAlmacen } from '../models/insumo-almacen';

/**
 * Normaliza una cadena de texto para comparaciones flexibles:
 * minúsculas, sin acentos ni diacríticos, y sin espacios duplicados.
 */
export function normalizarTexto(texto: string): string {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Escapa caracteres especiales para su uso seguro en expresiones regulares.
 */
export function escapeRegExp(cadena: string): string {
  return cadena.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Evalúa si una cadena coincide con un término candidato respetando límites de palabras completas,
 * previniendo falsos positivos por substrings dentro de otras palabras
 * (ej. "gin" en "ginger ale" o "tonica original", "ron" en "corona", "dry" en "londry").
 */
export function coincidePalabraCompleta(texto: string, candidato: string): boolean {
  if (!texto || !candidato) return false;
  const normTexto = normalizarTexto(texto);
  const normCandidato = normalizarTexto(candidato);
  if (!normTexto || !normCandidato) return false;

  // Coincidencia idéntica exacta
  if (normTexto === normCandidato) {
    return true;
  }

  // Búsqueda delimitada por límites de palabra o caracteres no alfanuméricos
  const regex = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(normCandidato)}(?:[^a-z0-9]|$)`, 'i');
  if (regex.test(normTexto)) {
    return true;
  }

  // Si el candidato es multipalabra (ej. "London Dry Gin", "Vermut Rosso"),
  // chequear si todas las palabras clave (>2 caracteres) están presentes como palabras delimitadas
  const tokensCandidato = normCandidato.split(' ').filter((t) => t.length > 2);
  if (tokensCandidato.length > 1) {
    return tokensCandidato.every((tc) => {
      const tokenRegex = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(tc)}(?:[^a-z0-9]|$)`, 'i');
      return tokenRegex.test(normTexto);
    });
  }

  return false;
}

/**
 * Evalúa si una botella de la despensa es compatible con un ingrediente de receta.
 * Cuando el ingrediente define `categoriaId` (estándar del recetario), evalúa estrictamente
 * por coincidencia taxonómica de Categoría y Subcategoría (sin usar palabras clave del nombre).
 * Mantiene soporte retrocompatible para ingredientes legacy que no posean `categoriaId`.
 */
export function esBotellaCompatible(
  botella: Bebida,
  ingrediente: IngredienteReceta
): boolean {
  if (ingrediente.tipo !== 'bebida') {
    return false;
  }

  // 1. Regla principal: Matching taxonómico estricto por Categoría y Subcategoría
  if (ingrediente.categoriaId && ingrediente.categoriaId.trim() !== '') {
    if (normalizarTexto(botella.categoria) !== normalizarTexto(ingrediente.categoriaId)) {
      return false;
    }

    // Si el ingrediente no exige subcategoría específica, cualquier botella de la categoría es compatible
    if (!ingrediente.subcategoria || ingrediente.subcategoria.trim() === '') {
      return true;
    }

    // Si el ingrediente exige subcategoría, la botella debe tener esa misma subcategoría asignada
    if (!botella.subcategoria || botella.subcategoria.trim() === '') {
      return false;
    }

    return normalizarTexto(botella.subcategoria) === normalizarTexto(ingrediente.subcategoria);
  }

  // 2. Fallback retrocompatible únicamente para ingredientes legacy sin `categoriaId`
  const candidatos = [
    ...(ingrediente.subcategoria ? [ingrediente.subcategoria] : []),
    ingrediente.nombre,
    ...(ingrediente.alternativas ?? []),
  ];

  if (botella.subcategoria) {
    const coincideSubcat = candidatos.some((candidato) =>
      coincidePalabraCompleta(botella.subcategoria!, candidato)
    );
    if (coincideSubcat) {
      return true;
    }
  }

  const camposBotella = [
    botella.nombre,
    botella.marca,
    `${botella.marca} ${botella.nombre}`,
  ];

  return candidatos.some((candidato) => {
    return camposBotella.some((campo) => {
      return coincidePalabraCompleta(campo, candidato);
    });
  });
}

/**
 * Resultado de evaluar un ingrediente individual contra el stock del bar y del almacén
 */
export interface EvaluacionIngrediente {
  ingrediente: IngredienteReceta;
  disponible: boolean;
  motivo?: 'sin_botella' | 'stock_insuficiente' | 'sin_insumo';
  botellaSugerida?: Bebida;
  insumoSugerido?: InsumoAlmacen;
  botellasCompatibles: Bebida[];
  volumenRequeridoMl: number;
  volumenDisponibleMl: number;
}

/**
 * Evalúa un ingrediente de una receta frente a la lista de bebidas de la despensa
 * y a los insumos disponibles en el almacén.
 */
export function evaluarIngrediente(
  ingrediente: IngredienteReceta,
  bebidas: Bebida[],
  insumosAlmacen?: InsumoAlmacen[]
): EvaluacionIngrediente {
  if (ingrediente.tipo === 'guarnicion_insumo') {
    if (!insumosAlmacen) {
      return {
        ingrediente,
        disponible: true,
        botellasCompatibles: [],
        volumenRequeridoMl: 0,
        volumenDisponibleMl: 0,
      };
    }

    const insumoEncontrado = ingrediente.insumoId
      ? insumosAlmacen.find((item) => item.id === ingrediente.insumoId)
      : insumosAlmacen.find(
          (item) =>
            normalizarTexto(item.nombre) === normalizarTexto(ingrediente.nombre) ||
            (item.aliases ?? []).some(
              (alias) => normalizarTexto(alias) === normalizarTexto(ingrediente.nombre)
            )
        );

    const estaDisponible = Boolean(insumoEncontrado?.disponible);
    return {
      ingrediente,
      disponible: estaDisponible,
      motivo: estaDisponible ? undefined : 'sin_insumo',
      insumoSugerido: insumoEncontrado,
      botellasCompatibles: [],
      volumenRequeridoMl: 0,
      volumenDisponibleMl: 0,
    };
  }

  const volumenRequerido = ingrediente.cantidadMl ?? 0;
  const compatibles = bebidas.filter((b) => esBotellaCompatible(b, ingrediente));

  // Ordenar botellas compatibles por volumen restante descendente (para sugerir la más llena)
  compatibles.sort((a, b) => b.volumenRestanteMl - a.volumenRestanteMl);

  if (compatibles.length === 0) {
    return {
      ingrediente,
      disponible: false,
      motivo: 'sin_botella',
      botellasCompatibles: [],
      volumenRequeridoMl: volumenRequerido,
      volumenDisponibleMl: 0,
    };
  }

  // Buscar si alguna botella compatible tiene stock suficiente
  const botellaSuficiente = compatibles.find((b) => b.volumenRestanteMl >= volumenRequerido);

  if (botellaSuficiente) {
    return {
      ingrediente,
      disponible: true,
      botellaSugerida: botellaSuficiente,
      botellasCompatibles: compatibles,
      volumenRequeridoMl: volumenRequerido,
      volumenDisponibleMl: botellaSuficiente.volumenRestanteMl,
    };
  }

  // Hay botellas compatibles pero ninguna alcanza el volumen requerido
  const mejorCandidata = compatibles[0];
  return {
    ingrediente,
    disponible: false,
    motivo: 'stock_insuficiente',
    botellaSugerida: mejorCandidata,
    botellasCompatibles: compatibles,
    volumenRequeridoMl: volumenRequerido,
    volumenDisponibleMl: mejorCandidata.volumenRestanteMl,
  };
}

/**
 * Resultado consolidado de evaluar una receta frente a la despensa
 */
export interface EvaluacionReceta {
  receta: Receta;
  puedePreparar: boolean;
  cantidadFaltantes: number;
  ingredientesEvaluados: EvaluacionIngrediente[];
  ingredientesDisponibles: EvaluacionIngrediente[];
  ingredientesFaltantes: EvaluacionIngrediente[];
  seccion: 'armar_hoy' | 'casi_listos' | 'otras';
}

/**
 * Evalúa una receta completa comparando cada uno de sus ingredientes contra la despensa y el almacén.
 */
export function evaluarReceta(
  receta: Receta,
  bebidas: Bebida[],
  insumosAlmacen?: InsumoAlmacen[]
): EvaluacionReceta {
  const ingredientesEvaluados = receta.ingredientes.map((ing) =>
    evaluarIngrediente(ing, bebidas, insumosAlmacen)
  );

  const ingredientesDisponibles = ingredientesEvaluados.filter((i) => i.disponible);
  const ingredientesFaltantes = ingredientesEvaluados.filter((i) => !i.disponible);
  const faltantesObligatorios = ingredientesFaltantes.filter((i) => !i.ingrediente.opcional);

  const puedePreparar = faltantesObligatorios.length === 0;
  const cantidadFaltantes = faltantesObligatorios.length;

  let seccion: 'armar_hoy' | 'casi_listos' | 'otras' = 'otras';
  if (puedePreparar) {
    seccion = 'armar_hoy';
  } else if (cantidadFaltantes === 1 || cantidadFaltantes === 2) {
    seccion = 'casi_listos';
  }

  return {
    receta,
    puedePreparar,
    cantidadFaltantes,
    ingredientesEvaluados,
    ingredientesDisponibles,
    ingredientesFaltantes,
    seccion,
  };
}

/**
 * Clasificación global del recetario completo
 */
export interface ClasificacionRecetario {
  armarHoy: EvaluacionReceta[];
  casiListos: EvaluacionReceta[];
  otras: EvaluacionReceta[];
  todas: EvaluacionReceta[];
  totalRecetas: number;
  totalArmables: number;
}

/**
 * Motor de recomendación de tragos en tiempo real:
 * Clasifica todas las recetas en tres secciones prioritarias:
 * - "armarHoy": 100% de ingredientes disponibles con stock suficiente.
 * - "casiListos": Faltan 1 o 2 ingredientes para completar el cóctel.
 * - "otras": Faltan 3 o más ingredientes.
 */
export function clasificarRecetas(
  recetas: Receta[],
  bebidas: Bebida[],
  insumosAlmacen?: InsumoAlmacen[]
): ClasificacionRecetario {
  const evaluaciones = recetas.map((r) => evaluarReceta(r, bebidas, insumosAlmacen));

  const armarHoy = evaluaciones
    .filter((e) => e.seccion === 'armar_hoy')
    .sort((a, b) => a.receta.nombre.localeCompare(b.receta.nombre));

  const casiListos = evaluaciones
    .filter((e) => e.seccion === 'casi_listos')
    .sort(
      (a, b) =>
        a.cantidadFaltantes - b.cantidadFaltantes ||
        a.receta.nombre.localeCompare(b.receta.nombre)
    );

  const otras = evaluaciones
    .filter((e) => e.seccion === 'otras')
    .sort((a, b) => a.receta.nombre.localeCompare(b.receta.nombre));

  return {
    armarHoy,
    casiListos,
    otras,
    todas: [...armarHoy, ...casiListos, ...otras],
    totalRecetas: recetas.length,
    totalArmables: armarHoy.length,
  };
}

/**
 * Simulación o validación de preparación de trago:
 * Verifica si todas las botellas tienen stock suficiente antes de proceder al descuento.
 * Devuelve error explicativo si alguna botella excede el stock disponible o si provocaría saldo negativo.
 */
export function validarDescuentoPreparacion(
  _receta: Receta,
  bebidasSeleccionadas: { ingredienteNombre: string; botella: Bebida; cantidadMl: number }[]
): { valido: boolean; motivo?: string } {
  for (const item of bebidasSeleccionadas) {
    if (item.cantidadMl <= 0) {
      return {
        valido: false,
        motivo: `La cantidad a descontar para ${item.botella.nombre} debe ser mayor a 0 ml.`,
      };
    }
    if (item.botella.volumenRestanteMl < item.cantidadMl) {
      return {
        valido: false,
        motivo: `Stock insuficiente para ${item.botella.nombre} (${item.botella.marca}). Disponible: ${item.botella.volumenRestanteMl} ml, Requerido: ${item.cantidadMl} ml.`,
      };
    }
  }

  return { valido: true };
}

