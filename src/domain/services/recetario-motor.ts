import { Bebida } from '../models/bebida';
import { IngredienteReceta, Receta } from '../models/receta';

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
 * Compara jerárquicamente por subcategoría asignada, nombre, marca y alternativas semánticas
 * mediante límites de palabra estrictos para evitar falsos positivos.
 */
export function esBotellaCompatible(
  botella: Bebida,
  ingrediente: IngredienteReceta
): boolean {
  if (ingrediente.tipo !== 'bebida') {
    return false;
  }

  const candidatos = [ingrediente.nombre, ...(ingrediente.alternativas ?? [])];

  // 1. Coincidencia jerárquica directa si la botella tiene subcategoría asignada
  if (botella.subcategoria) {
    const coincideSubcat = candidatos.some((candidato) =>
      coincidePalabraCompleta(botella.subcategoria!, candidato)
    );
    if (coincideSubcat) {
      return true;
    }
  }

  // 2. Coincidencia estricta por límites de palabra en nombre, marca o combinaciones (retrocompatible)
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
 * Resultado de evaluar un ingrediente individual contra el stock del bar
 */
export interface EvaluacionIngrediente {
  ingrediente: IngredienteReceta;
  disponible: boolean;
  motivo?: 'sin_botella' | 'stock_insuficiente';
  botellaSugerida?: Bebida;
  botellasCompatibles: Bebida[];
  volumenRequeridoMl: number;
  volumenDisponibleMl: number;
}

/**
 * Evalúa un ingrediente de una receta frente a la lista de bebidas de la despensa.
 */
export function evaluarIngrediente(
  ingrediente: IngredienteReceta,
  bebidas: Bebida[]
): EvaluacionIngrediente {
  // Los insumos o guarniciones frescas no bloquean la preparación ni descuentan botellas
  if (ingrediente.tipo === 'guarnicion_insumo' || ingrediente.opcional) {
    return {
      ingrediente,
      disponible: true,
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
 * Evalúa una receta completa comparando cada uno de sus ingredientes contra la despensa.
 */
export function evaluarReceta(receta: Receta, bebidas: Bebida[]): EvaluacionReceta {
  const ingredientesEvaluados = receta.ingredientes.map((ing) =>
    evaluarIngrediente(ing, bebidas)
  );

  const ingredientesDisponibles = ingredientesEvaluados.filter((i) => i.disponible);
  const ingredientesFaltantes = ingredientesEvaluados.filter((i) => !i.disponible);

  const puedePreparar = ingredientesFaltantes.length === 0;
  const cantidadFaltantes = ingredientesFaltantes.length;

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
  bebidas: Bebida[]
): ClasificacionRecetario {
  const evaluaciones = recetas.map((r) => evaluarReceta(r, bebidas));

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

