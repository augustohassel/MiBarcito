import React, { useState } from 'react';
import { useCategorias } from '../context/InventoryContext';
import {
  Categoria,
  CATEGORIA_COMODIN_ID,
  validarCategoria,
  validarSubcategoria,
  puedeEliminarCategoria,
} from '../domain/models/categoria';
import { Bebida } from '../domain/models/bebida';
import { ConfirmModal } from './ConfirmModal';

export interface CategoriasConfigProps {
  bebidas: Bebida[];
}

export const CategoriasConfig: React.FC<CategoriasConfigProps> = ({ bebidas }) => {
  const { categorias, guardarCategoria, eliminarCategoria } = useCategorias();

  // Estado para crear nueva categoría
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  // Estado para editar categoría
  const [categoriaEnEdicionId, setCategoriaEnEdicionId] = useState<string | null>(null);
  const [nombreEnEdicion, setNombreEnEdicion] = useState('');
  const [errorEditar, setErrorEditar] = useState<string | null>(null);

  // Estado para eliminar
  const [categoriaAEliminar, setCategoriaAEliminar] = useState<Categoria | null>(null);
  const [mensajeBloqueoEliminacion, setMensajeBloqueoEliminacion] = useState<string | null>(null);

  // Estado para gestión de subcategorías
  const [categoriaExpandidaId, setCategoriaExpandidaId] = useState<string | null>(null);
  const [nuevaSubcatTexto, setNuevaSubcatTexto] = useState('');
  const [errorSubcat, setErrorSubcat] = useState<string | null>(null);

  // Cantidad de bebidas por categoría
  const getCantidadBebidas = (catId: string): number => {
    return bebidas.filter((b) => b.categoria === catId).length;
  };

  // Handler: Crear nueva categoría
  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCrear(null);

    const errores = validarCategoria({ nombre: nuevoNombre }, categorias);
    if (errores.nombre) {
      setErrorCrear(errores.nombre);
      return;
    }

    const ahora = new Date().toISOString();
    const id = `cat-${crypto.randomUUID().slice(0, 8)}`;
    const maxOrden = categorias.reduce((max, c) => Math.max(max, c.orden || 0), 0);

    const nuevaCategoria: Categoria = {
      id,
      nombre: nuevoNombre.trim(),
      esPredeterminada: false,
      orden: maxOrden + 1,
      subcategorias: [],
      fechaCreacion: ahora,
      fechaActualizacion: ahora,
    };

    try {
      await guardarCategoria(nuevaCategoria);
      setNuevoNombre('');
    } catch (err) {
      setErrorCrear('Ocurrió un error al guardar la categoría');
      console.error(err);
    }
  };

  // Handlers para Subcategorías
  const toggleExpandirSubcategorias = (catId: string) => {
    if (categoriaExpandidaId === catId) {
      setCategoriaExpandidaId(null);
    } else {
      setCategoriaExpandidaId(catId);
      setNuevaSubcatTexto('');
      setErrorSubcat(null);
    }
  };

  const handleAgregarSubcategoria = async (categoria: Categoria) => {
    setErrorSubcat(null);
    const actuales = categoria.subcategorias ?? [];
    const validacion = validarSubcategoria(nuevaSubcatTexto, actuales);
    if (!validacion.valido) {
      setErrorSubcat(validacion.error || 'Nombre de subcategoría inválido');
      return;
    }

    const categoriaActualizada: Categoria = {
      ...categoria,
      subcategorias: [...actuales, nuevaSubcatTexto.trim()],
      fechaActualizacion: new Date().toISOString(),
    };

    try {
      await guardarCategoria(categoriaActualizada);
      setNuevaSubcatTexto('');
    } catch (err) {
      console.error(err);
      setErrorSubcat('Ocurrió un error al guardar la subcategoría');
    }
  };

  const handleEliminarSubcategoria = async (
    categoria: Categoria,
    subcategoriaAEliminar: string
  ) => {
    const actuales = categoria.subcategorias ?? [];
    const filtradas = actuales.filter((s) => s !== subcategoriaAEliminar);

    const categoriaActualizada: Categoria = {
      ...categoria,
      subcategorias: filtradas,
      fechaActualizacion: new Date().toISOString(),
    };

    try {
      await guardarCategoria(categoriaActualizada);
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: Iniciar edición
  const handleIniciarEditar = (categoria: Categoria) => {
    setCategoriaEnEdicionId(categoria.id);
    setNombreEnEdicion(categoria.nombre);
    setErrorEditar(null);
  };

  // Handler: Guardar edición
  const handleGuardarEdicion = async (categoria: Categoria) => {
    setErrorEditar(null);

    const errores = validarCategoria(
      { id: categoria.id, nombre: nombreEnEdicion },
      categorias
    );
    if (errores.nombre) {
      setErrorEditar(errores.nombre);
      return;
    }

    const categoriaActualizada: Categoria = {
      ...categoria,
      nombre: nombreEnEdicion.trim(),
      fechaActualizacion: new Date().toISOString(),
    };

    try {
      await guardarCategoria(categoriaActualizada);
      setCategoriaEnEdicionId(null);
      setNombreEnEdicion('');
    } catch (err) {
      setErrorEditar('Ocurrió un error al actualizar la categoría');
      console.error(err);
    }
  };

  const handleCancelarEdicion = () => {
    setCategoriaEnEdicionId(null);
    setNombreEnEdicion('');
    setErrorEditar(null);
  };

  // Handler: Solicitar eliminación
  const handleSolicitarEliminar = (categoria: Categoria) => {
    setMensajeBloqueoEliminacion(null);
    const cantidadEnUso = getCantidadBebidas(categoria.id);
    const validacion = puedeEliminarCategoria(categoria.id, cantidadEnUso);

    if (!validacion.puede) {
      setMensajeBloqueoEliminacion(validacion.motivo || 'No se puede eliminar la categoría');
      return;
    }

    setCategoriaAEliminar(categoria);
  };

  // Handler: Confirmar eliminación
  const handleConfirmarEliminar = async () => {
    if (!categoriaAEliminar) return;

    try {
      const resultado = await eliminarCategoria(categoriaAEliminar.id);
      if (!resultado.ok) {
        setMensajeBloqueoEliminacion(resultado.motivo || 'No se pudo eliminar la categoría');
      }
    } catch (err) {
      console.error(err);
      setMensajeBloqueoEliminacion('Ocurrió un error al eliminar la categoría');
    } finally {
      setCategoriaAEliminar(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Explicación de la solapa */}
      <div>
        <h4 className="text-sm font-semibold text-on-surface">
          Gestión de Categorías de Bebidas
        </h4>
        <p className="text-xs text-on-surface-variant mt-1">
          Personalizá las categorías disponibles para clasificar y filtrar las botellas de tu
          despensa. Las categorías predeterminadas pueden renombrarse y solo la categoría "Otro" es
          inmutable.
        </p>
      </div>

      {/* Alerta de bloqueo de eliminación */}
      {mensajeBloqueoEliminacion && (
        <div className="p-3 rounded-xl bg-status-amber/15 border border-status-amber/30 text-status-amber text-xs flex items-start justify-between gap-2">
          <span>⚠️ {mensajeBloqueoEliminacion}</span>
          <button
            onClick={() => setMensajeBloqueoEliminacion(null)}
            className="text-status-amber font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Formulario: Nueva Categoría */}
      <form
        onSubmit={handleCrearCategoria}
        className="p-3.5 bg-surface rounded-xl border border-outline flex flex-col gap-2"
      >
        <span className="text-xs font-semibold text-on-surface">Nueva Categoría</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={nuevoNombre}
            onChange={(e) => {
              setNuevoNombre(e.target.value);
              if (errorCrear) setErrorCrear(null);
            }}
            placeholder="Ej: Tequila, Bitter Artesanal..."
            aria-label="Nombre de nueva categoría"
            className="flex-1 bg-surface-container border border-outline rounded-xl px-3 py-1.5 text-xs sm:text-sm text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            + Agregar
          </button>
        </div>
        {errorCrear && (
          <p className="text-xs text-status-rose mt-0.5">{errorCrear}</p>
        )}
      </form>

      {/* Listado de Categorías */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          Categorías Disponibles ({categorias.length})
        </span>

        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
          {categorias.map((cat) => {
            const enEdicion = categoriaEnEdicionId === cat.id;
            const cantidadBebidas = getCantidadBebidas(cat.id);
            const esComodin = cat.id === CATEGORIA_COMODIN_ID;

            return (
              <div
                key={cat.id}
                className="flex flex-col p-2.5 bg-surface rounded-xl border border-outline gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  {enEdicion ? (
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={nombreEnEdicion}
                          onChange={(e) => {
                            setNombreEnEdicion(e.target.value);
                            if (errorEditar) setErrorEditar(null);
                          }}
                          aria-label="Editar nombre de categoría"
                          className="flex-1 bg-surface-container border border-primary rounded-lg px-2.5 py-1 text-xs text-on-surface focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleGuardarEdicion(cat)}
                          className="px-2.5 py-1 text-xs font-medium bg-status-emerald hover:bg-status-emerald/90 text-white rounded-lg transition-colors cursor-pointer"
                          title="Guardar nombre"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelarEdicion}
                          className="px-2 py-1 text-xs font-medium bg-surface-container-high hover:bg-surface text-on-surface rounded-lg transition-colors cursor-pointer"
                          title="Cancelar"
                        >
                          ✕
                        </button>
                      </div>
                      {errorEditar && (
                        <span className="text-xs text-status-rose">{errorEditar}</span>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-on-surface truncate">
                          {cat.nombre}
                        </span>
                        {cat.esPredeterminada ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-container-high text-on-surface-variant border border-outline">
                            Predeterminada
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-status-emerald/15 text-status-emerald border border-status-emerald/30">
                            Personalizada
                          </span>
                        )}
                        <span className="text-[11px] text-on-surface-variant">
                          ({cantidadBebidas} {cantidadBebidas === 1 ? 'botella' : 'botellas'})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleExpandirSubcategorias(cat.id)}
                          className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                            categoriaExpandidaId === cat.id
                              ? 'bg-primary/15 text-primary border border-primary/30'
                              : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
                          }`}
                          title="Administrar subcategorías"
                          aria-label={`Administrar subcategorías de ${cat.nombre}`}
                        >
                          <span>🏷️</span>
                          <span className="hidden sm:inline">Subcats</span>
                          <span className="text-[11px]">({(cat.subcategorias ?? []).length})</span>
                          <span>{categoriaExpandidaId === cat.id ? '▲' : '▼'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleIniciarEditar(cat)}
                          className="px-2 py-1 text-xs font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
                          title="Renombrar categoría"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSolicitarEliminar(cat)}
                          disabled={esComodin}
                          className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
                            esComodin
                              ? 'text-on-surface-variant/40 cursor-not-allowed opacity-50'
                              : 'text-on-surface-variant hover:text-status-rose hover:bg-status-rose/10 cursor-pointer'
                          }`}
                          title={
                            esComodin
                              ? "La categoría 'Otro' es el comodín reservado del sistema y no puede eliminarse."
                              : 'Eliminar categoría'
                          }
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Panel expandible de Subcategorías */}
                {categoriaExpandidaId === cat.id && (
                  <div className="mt-1 pt-2 border-t border-outline/50 flex flex-col gap-2">
                    <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                      Subcategorías de {cat.nombre}
                    </span>

                    {/* Chips de subcategorías */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {(cat.subcategorias ?? []).length === 0 ? (
                        <span className="text-xs text-on-surface-variant italic">
                          Sin subcategorías registradas
                        </span>
                      ) : (
                        (cat.subcategorias ?? []).map((sub) => (
                          <span
                            key={sub}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-container border border-outline text-on-surface"
                          >
                            <span>{sub}</span>
                            <button
                              type="button"
                              onClick={() => handleEliminarSubcategoria(cat, sub)}
                              className="text-on-surface-variant hover:text-status-rose transition-colors cursor-pointer font-bold leading-none ml-0.5"
                              title={`Eliminar ${sub}`}
                              aria-label={`Eliminar subcategoría ${sub}`}
                            >
                              ✕
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Formulario para agregar subcategoría */}
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        value={nuevaSubcatTexto}
                        onChange={(e) => {
                          setNuevaSubcatTexto(e.target.value);
                          if (errorSubcat) setErrorSubcat(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAgregarSubcategoria(cat);
                          }
                        }}
                        placeholder={`Nueva subcategoría para ${cat.nombre}...`}
                        aria-label={`Nueva subcategoría para ${cat.nombre}`}
                        className="flex-1 bg-surface-container border border-outline rounded-lg px-2.5 py-1 text-xs text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => handleAgregarSubcategoria(cat)}
                        aria-label={`Agregar subcategoría a ${cat.nombre}`}
                        className="px-3 py-1 text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary rounded-lg transition-colors cursor-pointer"
                      >
                        + Agregar
                      </button>
                    </div>
                    {errorSubcat && (
                      <p className="text-[11px] text-status-rose">{errorSubcat}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      <ConfirmModal
        isOpen={Boolean(categoriaAEliminar)}
        titulo="Eliminar Categoría"
        mensaje={`¿Estás seguro de que deseás eliminar la categoría "${categoriaAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        textoConfirmar="Sí, eliminar"
        textoCancelar="Cancelar"
        variante="peligro"
        onConfirm={handleConfirmarEliminar}
        onCancel={() => setCategoriaAEliminar(null)}
      />
    </div>
  );
};
