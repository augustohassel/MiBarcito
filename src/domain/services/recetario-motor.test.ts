import { describe, it, expect } from 'vitest';
import {
  normalizarTexto,
  escapeRegExp,
  coincidePalabraCompleta,
  esBotellaCompatible,
  evaluarIngrediente,
  evaluarReceta,
  clasificarRecetas,
  validarDescuentoPreparacion,
} from './recetario-motor';
import { Bebida } from '../models/bebida';
import { IngredienteReceta, RECETAS_PREDETERMINADAS } from '../models/receta';

describe('Motor de Recomendación de Tragos (recetario-motor)', () => {
  const ginBombay: Bebida = {
    id: 'bebida-1',
    nombre: 'London Dry Gin',
    marca: 'Bombay Sapphire',
    categoria: 'destilado',
    subcategoria: 'Gin',
    volumenTotalMl: 750,
    volumenRestanteMl: 500,
    precioEstimado: 25000,
    esFavorito: true,
    fechaCreacion: '2026-11-01T00:00:00.000Z',
    fechaActualizacion: '2026-11-01T00:00:00.000Z',
  };

  const campari: Bebida = {
    id: 'bebida-2',
    nombre: 'Bitter',
    marca: 'Campari',
    categoria: 'aperitivo_bitter',
    subcategoria: 'Bitter Rojo',
    volumenTotalMl: 750,
    volumenRestanteMl: 300,
    precioEstimado: 12000,
    esFavorito: false,
    fechaCreacion: '2026-11-01T00:00:00.000Z',
    fechaActualizacion: '2026-11-01T00:00:00.000Z',
  };

  const vermutRosso: Bebida = {
    id: 'bebida-3',
    nombre: 'Rosso',
    marca: 'Carpano',
    categoria: 'aperitivo_bitter',
    subcategoria: 'Vermut Rosso',
    volumenTotalMl: 1000,
    volumenRestanteMl: 200,
    precioEstimado: 9000,
    esFavorito: false,
    fechaCreacion: '2026-11-01T00:00:00.000Z',
    fechaActualizacion: '2026-11-01T00:00:00.000Z',
  };

  const tonica: Bebida = {
    id: 'bebida-4',
    nombre: 'Agua Tónica',
    marca: 'Paso de los Toros',
    categoria: 'mixer_sin_alcohol',
    subcategoria: 'Tónica',
    volumenTotalMl: 1500,
    volumenRestanteMl: 1000,
    precioEstimado: 2000,
    esFavorito: false,
    fechaCreacion: '2026-11-01T00:00:00.000Z',
    fechaActualizacion: '2026-11-01T00:00:00.000Z',
  };

  describe('normalizarTexto', () => {
    it('elimina mayúsculas, diacríticos y espacios duplicados', () => {
      expect(normalizarTexto('  Cón  Acento  Y  MAYÚSCULAS  ')).toBe('con acento y mayusculas');
    });
  });

  describe('escapeRegExp y coincidePalabraCompleta (Búsqueda Estricta)', () => {
    it('escapa caracteres especiales de regex correctamente', () => {
      expect(escapeRegExp('Aperitivo / Bitter (Rojo) [50ml]')).toBe(
        'Aperitivo / Bitter \\(Rojo\\) \\[50ml\\]'
      );
      expect(escapeRegExp('Gin+Tonic?*')).toBe('Gin\\+Tonic\\?\\*');
    });

    it('coincide por palabra exacta delimitada sin falsos positivos por substrings', () => {
      // Caso crítico: Gin no debe matchear Ginger Ale ni Tónica Original
      expect(coincidePalabraCompleta('Ginger Ale Schweppes', 'Gin')).toBe(false);
      expect(coincidePalabraCompleta('Paso de los Toros Tonica Original', 'Gin')).toBe(false);

      // Caso crítico: Ron no debe matchear Corona
      expect(coincidePalabraCompleta('Cerveza Corona Extra', 'Ron')).toBe(false);

      // Coincidencias válidas
      expect(coincidePalabraCompleta('Tanqueray London Dry Gin', 'Gin')).toBe(true);
      expect(coincidePalabraCompleta('Havana Club Ron Añejo', 'Ron')).toBe(true);
      expect(coincidePalabraCompleta('Bacardi Carta Blanca Ron', 'Ron')).toBe(true);
    });

    it('soporta términos cortos (2 o 3 letras) sin colisiones accidentales', () => {
      expect(coincidePalabraCompleta('Té helado con limón', 'Té')).toBe(true);
      expect(coincidePalabraCompleta('Tenedor de bar', 'Té')).toBe(false);
      expect(coincidePalabraCompleta('Dry Martini', 'Dry')).toBe(true);
      expect(coincidePalabraCompleta('Londry Gin', 'Dry')).toBe(false);
    });
  });

  describe('esBotellaCompatible', () => {
    it('reconoce compatibilidad por marca o nombre', () => {
      const ingGin: IngredienteReceta = { nombre: 'Gin', tipo: 'bebida', cantidadMl: 50 };
      expect(esBotellaCompatible(ginBombay, ingGin)).toBe(true);

      const ingCampari: IngredienteReceta = { nombre: 'Campari', tipo: 'bebida', cantidadMl: 30 };
      expect(esBotellaCompatible(campari, ingCampari)).toBe(true);
    });

    it('reconoce compatibilidad por alternativas semánticas', () => {
      const ingBitter: IngredienteReceta = {
        nombre: 'Bitter Rojo',
        tipo: 'bebida',
        cantidadMl: 30,
        alternativas: ['Campari', 'Aperitivo / Bitter'],
      };
      expect(esBotellaCompatible(campari, ingBitter)).toBe(true);
    });

    it('caso crítico (erradicación de falsos positivos): Gin no empareja con Ginger Ale ni Tónica Original', () => {
      const gingerAle: Bebida = {
        id: 'bebida-ga',
        nombre: 'Ginger Ale',
        marca: 'Schweppes',
        categoria: 'mixer_sin_alcohol',
        volumenTotalMl: 1500,
        volumenRestanteMl: 1000,
        fechaCreacion: '2026-11-01T00:00:00.000Z',
        fechaActualizacion: '2026-11-01T00:00:00.000Z',
      };

      const tonicaOriginal: Bebida = {
        id: 'bebida-to',
        nombre: 'Tónica Original',
        marca: 'Paso de los Toros',
        categoria: 'mixer_sin_alcohol',
        volumenTotalMl: 1500,
        volumenRestanteMl: 1000,
        fechaCreacion: '2026-11-01T00:00:00.000Z',
        fechaActualizacion: '2026-11-01T00:00:00.000Z',
      };

      const ingGin: IngredienteReceta = {
        nombre: 'Gin',
        tipo: 'bebida',
        cantidadMl: 50,
        alternativas: ['London Dry', 'Ginebra'],
      };

      expect(esBotellaCompatible(gingerAle, ingGin)).toBe(false);
      expect(esBotellaCompatible(tonicaOriginal, ingGin)).toBe(false);
    });

    it('caso crítico: Ron no empareja con Cerveza Corona', () => {
      const cervezaCorona: Bebida = {
        id: 'bebida-corona',
        nombre: 'Corona Extra',
        marca: 'Cervecería Modelo',
        categoria: 'cerveza',
        volumenTotalMl: 330,
        volumenRestanteMl: 330,
        fechaCreacion: '2026-11-01T00:00:00.000Z',
        fechaActualizacion: '2026-11-01T00:00:00.000Z',
      };

      const ingRon: IngredienteReceta = {
        nombre: 'Ron',
        tipo: 'bebida',
        cantidadMl: 50,
        alternativas: ['Ron Dorado', 'Ron Blanco', 'Rum'],
      };

      expect(esBotellaCompatible(cervezaCorona, ingRon)).toBe(false);
    });

    it('matching jerárquico por subcategoría: empareja con precisión cuando la botella posee subcategoría', () => {
      const botellaBeefeater: Bebida = {
        id: 'bebida-beefeater',
        nombre: 'Beefeater 24',
        marca: 'Beefeater',
        categoria: 'destilado',
        subcategoria: 'Gin',
        volumenTotalMl: 750,
        volumenRestanteMl: 750,
        fechaCreacion: '2026-11-01T00:00:00.000Z',
        fechaActualizacion: '2026-11-01T00:00:00.000Z',
      };

      const ingGin: IngredienteReceta = { nombre: 'Gin', tipo: 'bebida', cantidadMl: 50 };
      expect(esBotellaCompatible(botellaBeefeater, ingGin)).toBe(true);

      const botellaCointreau: Bebida = {
        id: 'bebida-cointreau',
        nombre: 'Liqueur',
        marca: 'Cointreau',
        categoria: 'licor',
        subcategoria: 'Triple Sec / Naranja',
        volumenTotalMl: 700,
        volumenRestanteMl: 700,
        fechaCreacion: '2026-11-01T00:00:00.000Z',
        fechaActualizacion: '2026-11-01T00:00:00.000Z',
      };

      const ingTripleSec: IngredienteReceta = {
        nombre: 'Licor de Naranja',
        tipo: 'bebida',
        cantidadMl: 25,
        alternativas: ['Triple Sec', 'Cointreau'],
      };
      expect(esBotellaCompatible(botellaCointreau, ingTripleSec)).toBe(true);

      const botellaFernet: Bebida = {
        id: 'bebida-fernet',
        nombre: 'Fernet',
        marca: 'Branca',
        categoria: 'aperitivo_bitter',
        subcategoria: 'Fernet',
        volumenTotalMl: 750,
        volumenRestanteMl: 750,
        fechaCreacion: '2026-11-01T00:00:00.000Z',
        fechaActualizacion: '2026-11-01T00:00:00.000Z',
      };

      const ingCampari: IngredienteReceta = {
        nombre: 'Campari',
        tipo: 'bebida',
        cantidadMl: 30,
        alternativas: ['Bitter Rojo'],
      };
      // Fernet no debe ser compatible con Campari / Bitter Rojo
      expect(esBotellaCompatible(botellaFernet, ingCampari)).toBe(false);
    });

    it('caso de falla / borde 1 (Retrocompatibilidad total): botellas legacy sin subcategoria no fallan en runtime', () => {
      const botellaSinSubcat: Bebida = {
        id: 'legacy-1',
        nombre: 'Tanqueray London Dry Gin',
        marca: 'Tanqueray',
        categoria: 'destilado',
        subcategoria: undefined,
        volumenTotalMl: 750,
        volumenRestanteMl: 500,
        fechaCreacion: '2026-11-01T00:00:00.000Z',
        fechaActualizacion: '2026-11-01T00:00:00.000Z',
      };

      const ingGin: IngredienteReceta = { nombre: 'Gin', tipo: 'bebida', cantidadMl: 50 };
      expect(esBotellaCompatible(botellaSinSubcat, ingGin)).toBe(true);

      const ingVodka: IngredienteReceta = { nombre: 'Vodka', tipo: 'bebida', cantidadMl: 50 };
      expect(esBotellaCompatible(botellaSinSubcat, ingVodka)).toBe(false);
    });

    it('evalúa estrictamente por categoría y subcategoría (sin usar palabras clave) cuando el ingrediente tiene categoriaId', () => {
      // Botella cuyo nombre y marca NO contienen la palabra "Gin", pero tiene categoria="destilado" y subcategoria="Gin"
      const apostoles: Bebida = {
        id: 'bebida-apostoles',
        nombre: 'Mate, Eucalipto y Peperina',
        marca: 'Príncipe de los Apóstoles',
        categoria: 'destilado',
        subcategoria: 'Gin',
        volumenTotalMl: 750,
        volumenRestanteMl: 600,
        fechaCreacion: '2026-11-01T00:00:00.000Z',
        fechaActualizacion: '2026-11-01T00:00:00.000Z',
      };

      const ingGinTaxonomico: IngredienteReceta = {
        nombre: 'Gin',
        tipo: 'bebida',
        categoriaId: 'destilado',
        subcategoria: 'Gin',
        cantidadMl: 50,
      };

      // Es compatible por categoría + subcategoría aunque no diga "Gin" en el nombre
      expect(esBotellaCompatible(apostoles, ingGinTaxonomico)).toBe(true);

      // Si una botella se llama "Gin London Dry" pero NO tiene la subcategoría "Gin" (ej. fue borrada o es otra), NO debe coincidir por palabra clave
      const botellaConNombreGinSinSubcategoria: Bebida = {
        id: 'bebida-sin-sub',
        nombre: 'Gin London Dry',
        marca: 'Bombay Sapphire',
        categoria: 'destilado',
        subcategoria: undefined,
        volumenTotalMl: 750,
        volumenRestanteMl: 500,
        fechaCreacion: '2026-11-01T00:00:00.000Z',
        fechaActualizacion: '2026-11-01T00:00:00.000Z',
      };

      expect(esBotellaCompatible(botellaConNombreGinSinSubcategoria, ingGinTaxonomico)).toBe(false);

      // Si el ingrediente pide categoría sin subcategoría específica ("Cualquiera"), acepta cualquier botella de esa categoría
      const ingCualquierDestilado: IngredienteReceta = {
        nombre: 'Destilado',
        tipo: 'bebida',
        categoriaId: 'destilado',
        subcategoria: undefined,
        cantidadMl: 50,
      };

      expect(esBotellaCompatible(botellaConNombreGinSinSubcategoria, ingCualquierDestilado)).toBe(true);
      expect(esBotellaCompatible(apostoles, ingCualquierDestilado)).toBe(true);
      expect(esBotellaCompatible(campari, ingCualquierDestilado)).toBe(false);
    });

    it('retorna false si el tipo es guarnición o insumo', () => {
      const ingHielo: IngredienteReceta = { nombre: 'Hielo', tipo: 'guarnicion_insumo' };
      expect(esBotellaCompatible(ginBombay, ingHielo)).toBe(false);
    });

    it('retorna false si no hay coincidencia semántica', () => {
      const ingWhisky: IngredienteReceta = { nombre: 'Whisky', tipo: 'bebida', cantidadMl: 50 };
      expect(esBotellaCompatible(ginBombay, ingWhisky)).toBe(false);
    });
  });

  describe('evaluarIngrediente', () => {
    it('marca disponible un ingrediente de tipo guarnición sin chequear botellas cuando no se provee almacén', () => {
      const ing: IngredienteReceta = { nombre: 'Rodaja de naranja', tipo: 'guarnicion_insumo' };
      const evalRes = evaluarIngrediente(ing, []);
      expect(evalRes.disponible).toBe(true);
    });

    it('evalúa guarniciones e insumos contra el catálogo del Almacén cuando se provee insumosAlmacen', () => {
      const ingAceituna: IngredienteReceta = {
        nombre: 'Aceituna verde',
        insumoId: 'insumo-aceituna',
        tipo: 'guarnicion_insumo',
        opcional: true,
      };

      const almacenSinAceitunas = [
        {
          id: 'insumo-aceituna',
          nombre: 'Aceitunas verdes',
          categoria: 'encurtidos_decoracion' as const,
          disponible: false,
          esPredeterminado: true,
          fechaCreacion: '2026-11-01T00:00:00.000Z',
          fechaActualizacion: '2026-11-01T00:00:00.000Z',
        },
      ];

      const evalFaltante = evaluarIngrediente(ingAceituna, [], almacenSinAceitunas);
      expect(evalFaltante.disponible).toBe(false);
      expect(evalFaltante.motivo).toBe('sin_insumo');

      const almacenConAceitunas = [
        {
          ...almacenSinAceitunas[0],
          disponible: true,
        },
      ];

      const evalDisponible = evaluarIngrediente(ingAceituna, [], almacenConAceitunas);
      expect(evalDisponible.disponible).toBe(true);
      expect(evalDisponible.motivo).toBeUndefined();
    });

    it('marca disponible si hay botella compatible con stock suficiente', () => {
      const ing: IngredienteReceta = { nombre: 'Gin', cantidadMl: 50, tipo: 'bebida' };
      const evalRes = evaluarIngrediente(ing, [ginBombay]);
      expect(evalRes.disponible).toBe(true);
      expect(evalRes.botellaSugerida?.id).toBe(ginBombay.id);
    });

    it('detecta stock_insuficiente si la botella compatible no alcanza el volumen requerido', () => {
      const ginPocoStock: Bebida = { ...ginBombay, volumenRestanteMl: 20 };
      const ing: IngredienteReceta = { nombre: 'Gin', cantidadMl: 50, tipo: 'bebida' };
      const evalRes = evaluarIngrediente(ing, [ginPocoStock]);
      expect(evalRes.disponible).toBe(false);
      expect(evalRes.motivo).toBe('stock_insuficiente');
      expect(evalRes.volumenDisponibleMl).toBe(20);
    });

    it('detecta sin_botella si no existe ninguna botella compatible', () => {
      const ing: IngredienteReceta = { nombre: 'Tequila', cantidadMl: 50, tipo: 'bebida' };
      const evalRes = evaluarIngrediente(ing, [ginBombay]);
      expect(evalRes.disponible).toBe(false);
      expect(evalRes.motivo).toBe('sin_botella');
    });
  });

  describe('evaluarReceta y clasificarRecetas', () => {
    const recetaNegroni = RECETAS_PREDETERMINADAS.find((r) => r.id === 'receta-negroni')!;
    const recetaGinTonic = RECETAS_PREDETERMINADAS.find((r) => r.id === 'receta-gin-tonic')!;
    const recetaOldFashioned = RECETAS_PREDETERMINADAS.find((r) => r.id === 'receta-old-fashioned')!;

    it('clasifica en "armar_hoy" cuando el 100% de ingredientes requeridos tienen stock', () => {
      // Con ginBombay, campari y vermutRosso, Negroni debe poder armarse al 100%
      const evaluacion = evaluarReceta(recetaNegroni, [ginBombay, campari, vermutRosso]);
      expect(evaluacion.puedePreparar).toBe(true);
      expect(evaluacion.seccion).toBe('armar_hoy');
      expect(evaluacion.cantidadFaltantes).toBe(0);
    });

    it('clasifica en "casi_listos" si falta 1 o 2 ingredientes', () => {
      // Solo tenemos gin y campari; falta vermut (1 ingrediente)
      const evaluacion = evaluarReceta(recetaNegroni, [ginBombay, campari]);
      expect(evaluacion.puedePreparar).toBe(false);
      expect(evaluacion.seccion).toBe('casi_listos');
      expect(evaluacion.cantidadFaltantes).toBe(1);
      expect(evaluacion.ingredientesFaltantes[0].ingrediente.nombre).toBe('Vermut Rosso');
    });

    it('clasifica en "otras" si faltan más de 2 ingredientes', () => {
      // Negroni requiere 3 bebidas: Gin, Campari y Vermut Rosso. Con la despensa vacía, faltan 3
      const evaluacion = evaluarReceta(recetaNegroni, []);
      expect(evaluacion.puedePreparar).toBe(false);
      expect(evaluacion.seccion).toBe('otras');
      expect(evaluacion.cantidadFaltantes).toBe(3);
    });

    it('ingredientes opcionales faltantes reflejan disponible: false pero no impiden armar_hoy ni suman faltantes', () => {
      const recetaCubaLibre = RECETAS_PREDETERMINADAS.find((r) => r.id === 'receta-cuba-libre')!;
      const ronHavana: Bebida = {
        id: 'ron-1',
        nombre: 'Ron Blanco',
        marca: 'Havana Club',
        categoria: 'destilado',
        subcategoria: 'Ron',
        volumenTotalMl: 750,
        volumenRestanteMl: 500,
        fechaCreacion: '2026-11-01T00:00:00.000Z',
        fechaActualizacion: '2026-11-01T00:00:00.000Z',
      };
      const cocaCola: Bebida = {
        id: 'cola-1',
        nombre: 'Coca Cola',
        marca: 'Coca Cola',
        categoria: 'mixer_sin_alcohol',
        subcategoria: 'Cola',
        volumenTotalMl: 1500,
        volumenRestanteMl: 1500,
        fechaCreacion: '2026-11-01T00:00:00.000Z',
        fechaActualizacion: '2026-11-01T00:00:00.000Z',
      };

      // Tenemos Ron y Coca Cola, pero NO Jugo de Lima fresca (ingrediente opcional)
      const evaluacion = evaluarReceta(recetaCubaLibre, [ronHavana, cocaCola]);

      expect(evaluacion.puedePreparar).toBe(true);
      expect(evaluacion.seccion).toBe('armar_hoy');
      expect(evaluacion.cantidadFaltantes).toBe(0);

      const itemLima = evaluacion.ingredientesEvaluados.find(
        (i) => i.ingrediente.nombre === 'Jugo de Lima fresca'
      );
      expect(itemLima).toBeDefined();
      expect(itemLima?.disponible).toBe(false);
      expect(itemLima?.ingrediente.opcional).toBe(true);
    });

    it('clasificarRecetas segrega correctamente las recetas del catálogo en sus secciones', () => {
      const despensa = [ginBombay, campari, vermutRosso, tonica];
      const resultado = clasificarRecetas([recetaNegroni, recetaGinTonic, recetaOldFashioned], despensa);

      // Negroni y Gin Tonic están completos
      expect(resultado.armarHoy.map((e) => e.receta.nombre)).toEqual(
        expect.arrayContaining(['Gin Tonic', 'Negroni'])
      );
      expect(resultado.totalArmables).toBe(2);

      // Old Fashioned no tiene Whisky ni Angostura
      expect(resultado.casiListos.length + resultado.otras.length).toBe(1);
    });
  });

  describe('validarDescuentoPreparacion (Caso borde crítico)', () => {
    const recetaNegroni = RECETAS_PREDETERMINADAS.find((r) => r.id === 'receta-negroni')!;

    it('aprueba la preparación si todas las botellas tienen volumen suficiente', () => {
      const seleccion = [
        { ingredienteNombre: 'Gin', botella: ginBombay, cantidadMl: 30 },
        { ingredienteNombre: 'Campari', botella: campari, cantidadMl: 30 },
        { ingredienteNombre: 'Vermut Rosso', botella: vermutRosso, cantidadMl: 30 },
      ];
      const res = validarDescuentoPreparacion(recetaNegroni, seleccion);
      expect(res.valido).toBe(true);
    });

    it('bloquea la preparación si una botella no tiene suficiente stock (evita saldo negativo)', () => {
      const vermutVacio: Bebida = { ...vermutRosso, volumenRestanteMl: 10 };
      const seleccion = [
        { ingredienteNombre: 'Gin', botella: ginBombay, cantidadMl: 30 },
        { ingredienteNombre: 'Campari', botella: campari, cantidadMl: 30 },
        { ingredienteNombre: 'Vermut Rosso', botella: vermutVacio, cantidadMl: 30 },
      ];
      const res = validarDescuentoPreparacion(recetaNegroni, seleccion);
      expect(res.valido).toBe(false);
      expect(res.motivo).toContain('Stock insuficiente para Rosso (Carpano)');
      expect(res.motivo).toContain('Disponible: 10 ml, Requerido: 30 ml');
    });

    it('bloquea si la cantidad a descontar es <= 0', () => {
      const seleccion = [
        { ingredienteNombre: 'Gin', botella: ginBombay, cantidadMl: 0 },
      ];
      const res = validarDescuentoPreparacion(recetaNegroni, seleccion);
      expect(res.valido).toBe(false);
    });
  });
});

