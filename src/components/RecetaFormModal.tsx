import React, { useState, useEffect, useMemo } from 'react';
import {
  Receta,
  IngredienteReceta,
  MetodoPreparacion,
  TipoIngrediente,
  validarReceta,
  ErroresValidacionReceta,
} from '../domain/models/receta';
import { CATEGORIAS_PREDETERMINADAS, Categoria } from '../domain/models/categoria';
import { INSUMOS_PREDETERMINADOS, InsumoAlmacen } from '../domain/models/insumo-almacen';
import { useCategoriasOpcional, useAlmacenOpcional } from '../context/InventoryContext';

export interface RecetaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (receta: Receta) => void;
  recetaAEditar?: Receta | null;
}

const INGREDIENTE_INICIAL: IngredienteReceta = {
  nombre: 'Gin',
  cantidadMl: 50,
  unidad: 'ml',
  tipo: 'bebida',
  categoriaId: 'destilado',
  subcategoria: 'Gin',
  opcional: false,
};

function normalizarComparacion(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizarIngredienteBebida(
  ing: IngredienteReceta,
  categorias: Categoria[]
): IngredienteReceta {
  if (ing.tipo !== 'bebida') {
    return { ...ing };
  }

  if (ing.categoriaId) {
    const cat = categorias.find((c) => c.id === ing.categoriaId);
    const nombreResuelto =
      ing.nombre?.trim() || ing.subcategoria || cat?.nombre || ing.categoriaId;
    return {
      ...ing,
      nombre: nombreResuelto,
    };
  }

  // Inferir categoría y subcategoría si se edita una receta legacy sin categoriaId
  const nombreNorm = normalizarComparacion(ing.nombre || '');
  for (const cat of categorias) {
    const subMatch = (cat.subcategorias ?? []).find(
      (sub) => normalizarComparacion(sub) === nombreNorm
    );
    if (subMatch) {
      return {
        ...ing,
        categoriaId: cat.id,
        subcategoria: subMatch,
        nombre: ing.nombre?.trim() || subMatch,
      };
    }
    if (normalizarComparacion(cat.nombre) === nombreNorm || cat.id === nombreNorm) {
      return {
        ...ing,
        categoriaId: cat.id,
        subcategoria: undefined,
        nombre: ing.nombre?.trim() || cat.nombre,
      };
    }
  }

  const catDefecto = categorias[0] ?? CATEGORIAS_PREDETERMINADAS[0];
  const subDefecto = catDefecto.subcategorias?.[0];
  return {
    ...ing,
    categoriaId: catDefecto.id,
    subcategoria: subDefecto,
    nombre: ing.nombre?.trim() || subDefecto || catDefecto.nombre,
  };
}

export const RecetaFormModal: React.FC<RecetaFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  recetaAEditar,
}) => {
  const categoriasCtx = useCategoriasOpcional();
  const categoriasDisponibles = useMemo<Categoria[]>(() => {
    return categoriasCtx && categoriasCtx.categorias.length > 0
      ? categoriasCtx.categorias
      : CATEGORIAS_PREDETERMINADAS;
  }, [categoriasCtx?.categorias]);

  const almacenCtx = useAlmacenOpcional();
  const insumosDisponibles = useMemo<InsumoAlmacen[]>(() => {
    return almacenCtx && almacenCtx.insumos.length > 0
      ? almacenCtx.insumos
      : INSUMOS_PREDETERMINADOS;
  }, [almacenCtx?.insumos]);

  const crearIngredienteInicial = (): IngredienteReceta => {
    const cat =
      categoriasDisponibles.find((c) => c.id === 'destilado') ??
      categoriasDisponibles[0] ??
      CATEGORIAS_PREDETERMINADAS[0];
    const sub = cat.subcategorias?.[0];
    return {
      nombre: sub || cat.nombre,
      cantidadMl: 50,
      unidad: 'ml',
      tipo: 'bebida',
      categoriaId: cat.id,
      subcategoria: sub,
      opcional: false,
    };
  };

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cristaleria, setCristaleria] = useState('');
  const [metodo, setMetodo] = useState<MetodoPreparacion>('directo');
  const [ingredientes, setIngredientes] = useState<IngredienteReceta[]>([INGREDIENTE_INICIAL]);
  const [pasos, setPasos] = useState<string[]>(['']);
  const [errores, setErrores] = useState<ErroresValidacionReceta>({});

  useEffect(() => {
    if (recetaAEditar) {
      setNombre(recetaAEditar.nombre);
      setDescripcion(recetaAEditar.descripcion || '');
      setCristaleria(recetaAEditar.cristaleria || '');
      setMetodo(recetaAEditar.metodoPreparacion || recetaAEditar.metodo || 'directo');
      setIngredientes(
        recetaAEditar.ingredientes.length > 0
          ? recetaAEditar.ingredientes.map((i) =>
              normalizarIngredienteBebida(i, categoriasDisponibles)
            )
          : [crearIngredienteInicial()]
      );
      setPasos(recetaAEditar.pasos.length > 0 ? [...recetaAEditar.pasos] : ['']);
    } else {
      setNombre('');
      setDescripcion('');
      setCristaleria('Vaso Old Fashioned');
      setMetodo('directo');
      setIngredientes([crearIngredienteInicial()]);
      setPasos(['']);
    }
    setErrores({});
  }, [recetaAEditar, isOpen, categoriasDisponibles]);

  if (!isOpen) return null;

  // Manejadores de ingredientes
  const handleAgregarIngrediente = () => {
    setIngredientes([...ingredientes, crearIngredienteInicial()]);
  };

  const handleEliminarIngrediente = (index: number) => {
    if (ingredientes.length <= 1) return;
    setIngredientes(ingredientes.filter((_, i) => i !== index));
  };

  const handleCambiarTipoIngrediente = (index: number, nuevoTipo: TipoIngrediente) => {
    setIngredientes((prev) =>
      prev.map((ing, i) => {
        if (i !== index) return ing;
        if (nuevoTipo === 'bebida') {
          const base = crearIngredienteInicial();
          return {
            ...base,
            cantidadMl: ing.cantidadMl || 50,
            opcional: Boolean(ing.opcional),
          };
        }
        const primerInsumo = insumosDisponibles[0];
        return {
          nombre: primerInsumo?.nombre || 'Hielo',
          insumoId: primerInsumo?.id,
          tipo: 'guarnicion_insumo',
          categoriaId: undefined,
          subcategoria: undefined,
          cantidadMl: undefined,
          unidad: 'al gusto',
          opcional: Boolean(ing.opcional),
        };
      })
    );
  };

  const handleCambiarInsumoIngrediente = (index: number, nuevoInsumoId: string) => {
    const insumo = insumosDisponibles.find((ins) => ins.id === nuevoInsumoId);
    setIngredientes((prev) =>
      prev.map((ing, i) => {
        if (i !== index) return ing;
        if (!insumo) {
          return {
            ...ing,
            insumoId: undefined,
          };
        }
        return {
          ...ing,
          insumoId: insumo.id,
          nombre: insumo.nombre,
        };
      })
    );
  };

  const handleCambiarCategoriaIngrediente = (index: number, nuevaCategoriaId: string) => {
    const cat = categoriasDisponibles.find((c) => c.id === nuevaCategoriaId);
    const primeraSub = cat?.subcategorias?.[0];
    setIngredientes((prev) =>
      prev.map((ing, i) => {
        if (i !== index) return ing;
        return {
          ...ing,
          categoriaId: nuevaCategoriaId,
          subcategoria: primeraSub,
          nombre: primeraSub || cat?.nombre || nuevaCategoriaId,
        };
      })
    );
  };

  const handleCambiarSubcategoriaIngrediente = (index: number, nuevaSubcategoria: string) => {
    setIngredientes((prev) =>
      prev.map((ing, i) => {
        if (i !== index) return ing;
        const cat = categoriasDisponibles.find((c) => c.id === ing.categoriaId);
        const subLimpia = nuevaSubcategoria.trim() || undefined;
        return {
          ...ing,
          subcategoria: subLimpia,
          nombre: subLimpia || cat?.nombre || ing.nombre,
        };
      })
    );
  };

  const handleModificarIngrediente = (
    index: number,
    campo: keyof IngredienteReceta,
    valor: unknown
  ) => {
    setIngredientes((prev) =>
      prev.map((ing, i) => {
        if (i !== index) return ing;
        return { ...ing, [campo]: valor };
      })
    );
  };

  // Manejadores de pasos
  const handleAgregarPaso = () => {
    setPasos([...pasos, '']);
  };

  const handleEliminarPaso = (index: number) => {
    if (pasos.length <= 1) return;
    setPasos(pasos.filter((_, i) => i !== index));
  };

  const handleModificarPaso = (index: number, valor: string) => {
    setPasos((prev) => prev.map((p, i) => (i === index ? valor : p)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const timestamp = new Date().toISOString();
    const recetaData: Receta = {
      id: recetaAEditar ? recetaAEditar.id : `receta-propia-${Date.now()}`,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      cristaleria: cristaleria.trim(),
      metodoPreparacion: metodo,
      metodo: metodo,
      ingredientes: ingredientes.map((i) => {
        if (i.tipo === 'bebida') {
          const cat = categoriasDisponibles.find((c) => c.id === i.categoriaId);
          const subLimpia = i.subcategoria?.trim() || undefined;
          const nombreResuelto = subLimpia || cat?.nombre || i.nombre.trim();
          return {
            ...i,
            nombre: nombreResuelto,
            categoriaId: i.categoriaId,
            subcategoria: subLimpia,
            cantidadMl: Number(i.cantidadMl),
          };
        }
        return {
          ...i,
          nombre: i.nombre.trim(),
          categoriaId: undefined,
          subcategoria: undefined,
          cantidadMl: undefined,
        };
      }),
      pasos: pasos.map((p) => p.trim()).filter((p) => p.length > 0),
      esFavorito: recetaAEditar ? recetaAEditar.esFavorito : false,
      esPropia: true,
      fechaCreacion: recetaAEditar?.fechaCreacion || timestamp,
      fechaActualizacion: timestamp,
    };

    const err = validarReceta(recetaData);
    if (Object.keys(err).length > 0) {
      setErrores(err);
      return;
    }

    onSave(recetaData);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-surface-container rounded-3xl border border-outline w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">
            {recetaAEditar ? 'Editar Receta de Autor' : 'Nueva Receta de Autor'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Nombre y Método */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">
                Nombre del Cóctel *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="ej. Gin Basil Smash"
                data-testid="input-receta-nombre"
                className={`w-full px-3.5 py-2 rounded-xl bg-surface border text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary ${
                  errores.nombre ? 'border-status-rose' : 'border-outline'
                }`}
              />
              {errores.nombre && (
                <p className="text-xs text-status-rose mt-1">{errores.nombre}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">
                Método de Preparación *
              </label>
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value as MetodoPreparacion)}
                data-testid="select-receta-metodo"
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-outline text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="directo">Directo (en el vaso)</option>
                <option value="batido">Batido (coctelera / shaker)</option>
                <option value="refrescado">Refrescado (vaso mezclador)</option>
                <option value="licuado">Licuado (frozen)</option>
                <option value="macerado">Macerado (mortero)</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          {/* Cristalería y Descripción */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">
                Cristalería Recomendada *
              </label>
              <input
                type="text"
                value={cristaleria}
                onChange={(e) => setCristaleria(e.target.value)}
                placeholder="ej. Vaso Old Fashioned, Copa Coupé"
                data-testid="input-receta-cristaleria"
                className={`w-full px-3.5 py-2 rounded-xl bg-surface border text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary ${
                  errores.cristaleria ? 'border-status-rose' : 'border-outline'
                }`}
              />
              {errores.cristaleria && (
                <p className="text-xs text-status-rose mt-1">{errores.cristaleria}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">
                Descripción / Notas
              </label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Breve historia, perfil de sabor o aroma"
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-outline text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Sección de Ingredientes Dinámicos */}
          <div className="pt-2 border-t border-outline-variant">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-on-surface">
                Ingredientes ({ingredientes.length})
              </label>
              <button
                type="button"
                onClick={handleAgregarIngrediente}
                data-testid="btn-agregar-ingrediente"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                + Agregar ingrediente
              </button>
            </div>

            {errores.ingredientes && (
              <p className="text-xs text-status-rose mb-2">{errores.ingredientes}</p>
            )}

            <div className="space-y-3">
              {ingredientes.map((ing, idx) => {
                const catActual =
                  categoriasDisponibles.find((c) => c.id === ing.categoriaId) ??
                  categoriasDisponibles[0];
                const subcategoriasCat = catActual?.subcategorias ?? [];
                const opcionesSubcat =
                  ing.subcategoria && !subcategoriasCat.includes(ing.subcategoria)
                    ? [ing.subcategoria, ...subcategoriasCat]
                    : subcategoriasCat;

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-surface border border-outline-variant flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2.5"
                  >
                    <div className="w-full sm:w-36">
                      <select
                        value={ing.tipo}
                        aria-label={`Tipo de ingrediente ${idx + 1}`}
                        data-testid={`select-ingrediente-tipo-${idx}`}
                        onChange={(e) =>
                          handleCambiarTipoIngrediente(idx, e.target.value as TipoIngrediente)
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="bebida">Bebida (despensa)</option>
                        <option value="guarnicion_insumo">Insumo / Guarnición</option>
                      </select>
                    </div>

                    {ing.tipo === 'bebida' ? (
                      <>
                        <div className="flex-1 min-w-[130px] w-full sm:w-auto">
                          <select
                            value={ing.categoriaId || catActual?.id || ''}
                            aria-label={`Categoría del ingrediente ${idx + 1}`}
                            data-testid={`select-ingrediente-categoria-${idx}`}
                            onChange={(e) =>
                              handleCambiarCategoriaIngrediente(idx, e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {categoriasDisponibles.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.nombre}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex-1 min-w-[140px] w-full sm:w-auto">
                          <select
                            value={ing.subcategoria || ''}
                            aria-label={`Subcategoría del ingrediente ${idx + 1}`}
                            data-testid={`select-ingrediente-subcategoria-${idx}`}
                            onChange={(e) =>
                              handleCambiarSubcategoriaIngrediente(idx, e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">
                              Cualquiera ({catActual?.nombre || 'Categoría'})
                            </option>
                            {opcionesSubcat.map((sub) => (
                              <option key={sub} value={sub}>
                                {sub}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-24">
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              max="2000"
                              value={ing.cantidadMl || ''}
                              onChange={(e) =>
                                handleModificarIngrediente(
                                  idx,
                                  'cantidadMl',
                                  e.target.value ? Number(e.target.value) : undefined
                                )
                              }
                              placeholder="ml"
                              data-testid={`input-ingrediente-ml-${idx}`}
                              className="w-full pl-2 pr-6 py-1.5 rounded-lg bg-surface-container border border-outline text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] text-on-surface-variant">
                              ml
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                        <select
                          value={ing.insumoId || ''}
                          aria-label={`Insumo de almacén ${idx + 1}`}
                          data-testid={`select-ingrediente-insumo-${idx}`}
                          onChange={(e) =>
                            handleCambiarInsumoIngrediente(idx, e.target.value)
                          }
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Personalizado / Otro...</option>
                          {insumosDisponibles.map((ins) => (
                            <option key={ins.id} value={ins.id}>
                              {ins.nombre} ({ins.disponible ? '✓ Tengo' : '✕ No tengo'})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={ing.nombre}
                          onChange={(e) =>
                            handleModificarIngrediente(idx, 'nombre', e.target.value)
                          }
                          placeholder="Presentación o detalle (ej. Rodaja de lima, Aceituna verde)"
                          data-testid={`input-ingrediente-nombre-${idx}`}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-surface-container border border-outline text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    )}

                    <label className="flex items-center gap-1 text-[11px] text-on-surface-variant cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(ing.opcional)}
                        data-testid={`checkbox-ingrediente-opcional-${idx}`}
                        onChange={(e) =>
                          handleModificarIngrediente(idx, 'opcional', e.target.checked)
                        }
                        className="rounded border-outline text-primary focus:ring-primary"
                      />
                      Opcional
                    </label>

                    {ingredientes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleEliminarIngrediente(idx)}
                        data-testid={`btn-eliminar-ingrediente-${idx}`}
                        className="p-1 rounded-lg text-status-rose hover:bg-status-rose/10 self-end sm:self-center transition-colors"
                        title="Eliminar ingrediente"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sección de Pasos de Preparación */}
          <div className="pt-2 border-t border-outline-variant">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-on-surface">
                Pasos de Preparación ({pasos.length})
              </label>
              <button
                type="button"
                onClick={handleAgregarPaso}
                data-testid="btn-agregar-paso"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                + Agregar paso
              </button>
            </div>

            {errores.pasos && (
              <p className="text-xs text-status-rose mb-2">{errores.pasos}</p>
            )}

            <div className="space-y-2">
              {pasos.map((paso, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="w-6 text-center text-xs font-bold text-on-surface-variant pt-2 shrink-0">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={paso}
                    onChange={(e) => handleModificarPaso(idx, e.target.value)}
                    placeholder={`Paso ${idx + 1} de elaboración...`}
                    data-testid={`input-paso-${idx}`}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-surface border border-outline text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {pasos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleEliminarPaso(idx)}
                      data-testid={`btn-eliminar-paso-${idx}`}
                      className="p-1.5 rounded-lg text-status-rose hover:bg-status-rose/10 transition-colors"
                      title="Eliminar paso"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer de Acciones */}
          <div className="pt-4 border-t border-outline-variant flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              data-testid="btn-guardar-receta"
              className="px-5 py-2 rounded-xl text-xs font-medium bg-primary hover:bg-primary-hover text-on-primary shadow-xs transition-colors"
            >
              {recetaAEditar ? 'Guardar Cambios' : 'Crear Receta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

