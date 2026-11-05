import React, { useState, useMemo } from 'react';
import {
  InsumoAlmacen,
  CategoriaInsumo,
  CATEGORIAS_INSUMO,
  obtenerLabelCategoriaInsumo,
  obtenerIconoCategoriaInsumo,
} from '../domain/models/insumo-almacen';

export interface AlmacenViewProps {
  insumos: InsumoAlmacen[];
  onToggleDisponible: (id: string) => Promise<void>;
  onGuardarInsumo: (insumo: InsumoAlmacen) => Promise<void>;
  onEliminarInsumo: (id: string) => Promise<{ ok: boolean; motivo?: string }>;
}

type FiltroDisponibilidad = 'todos' | 'disponibles' | 'faltantes';

export const AlmacenView: React.FC<AlmacenViewProps> = ({
  insumos,
  onToggleDisponible,
  onGuardarInsumo,
  onEliminarInsumo,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroDisponibilidad, setFiltroDisponibilidad] = useState<FiltroDisponibilidad>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaInsumo | 'todas'>('todas');

  // Formulario para agregar insumo propio
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState<CategoriaInsumo>('citricos_frutas');
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const contadores = useMemo(() => {
    const disponibles = insumos.filter((i) => i.disponible).length;
    return {
      total: insumos.length,
      disponibles,
      faltantes: insumos.length - disponibles,
    };
  }, [insumos]);

  const insumosFiltrados = useMemo(() => {
    return insumos
      .filter((item) => {
        if (filtroDisponibilidad === 'disponibles' && !item.disponible) return false;
        if (filtroDisponibilidad === 'faltantes' && item.disponible) return false;
        if (filtroCategoria !== 'todas' && item.categoria !== filtroCategoria) return false;
        if (busqueda.trim()) {
          const query = busqueda.trim().toLowerCase();
          return item.nombre.toLowerCase().includes(query);
        }
        return true;
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [insumos, filtroDisponibilidad, filtroCategoria, busqueda]);

  const handleCrearInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);

    const nombreLimpio = nuevoNombre.trim();
    if (!nombreLimpio) {
      setErrorForm('Ingresá el nombre del insumo o guarnición.');
      return;
    }

    const existe = insumos.some(
      (i) => i.nombre.trim().toLowerCase() === nombreLimpio.toLowerCase()
    );
    if (existe) {
      setErrorForm('Ya existe un insumo con ese nombre en tu almacén.');
      return;
    }

    const ahora = new Date().toISOString();
    const nuevo: InsumoAlmacen = {
      id: `insumo-custom-${Date.now()}`,
      nombre: nombreLimpio,
      categoria: nuevaCategoria,
      disponible: true,
      esPredeterminado: false,
      fechaCreacion: ahora,
      fechaActualizacion: ahora,
    };

    await onGuardarInsumo(nuevo);
    setNuevoNombre('');
    setNuevaCategoria('citricos_frutas');
    setMostrarFormulario(false);
  };

  return (
    <section aria-label="Almacén de Guarniciones e Insumos" className="space-y-6">
      {/* Encabezado y resumen */}
      <div className="bg-surface-container rounded-2xl border border-outline p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <span>🍋</span> Almacén de Guarniciones e Insumos
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Marcá con un clic qué guarniciones, cítricos, hierbas o básicos tenés hoy para que el recetario evalúe tus tragos con precisión.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-surface px-3 py-2 rounded-xl border border-outline text-xs font-semibold">
            <span className="text-status-emerald" data-testid="contador-almacen-disponibles">
              ✓ {contadores.disponibles} Tengo
            </span>
            <span className="text-outline">|</span>
            <span className="text-on-surface-variant" data-testid="contador-almacen-faltantes">
              ✕ {contadores.faltantes} No tengo
            </span>
          </div>

          <button
            type="button"
            data-testid="btn-nuevo-insumo"
            onClick={() => {
              setErrorForm(null);
              setMostrarFormulario((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-on-primary bg-primary hover:bg-primary-hover shadow-xs transition-colors cursor-pointer"
          >
            {mostrarFormulario ? 'Cancelar' : '+ Agregar Insumo'}
          </button>
        </div>
      </div>

      {/* Formulario colapsable para agregar insumo personalizado */}
      {mostrarFormulario && (
        <form
          onSubmit={handleCrearInsumo}
          data-testid="form-nuevo-insumo"
          className="bg-surface-container border border-primary/40 rounded-2xl p-5 space-y-4 shadow-xs"
        >
          <h3 className="text-sm font-bold text-on-surface">
            Nuevo Insumo o Guarnición Personalizada
          </h3>

          {errorForm && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-status-rose/10 border border-status-rose/30 text-xs font-medium text-status-rose"
            >
              {errorForm}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-on-surface-variant mb-1">
                Nombre del insumo *
              </label>
              <input
                type="text"
                data-testid="input-nombre-insumo"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="ej. Pomelo rosado, Albahaca fresca, Canela en rama"
                className="w-full rounded-xl border border-outline bg-surface px-3.5 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">
                Categoría *
              </label>
              <select
                data-testid="select-categoria-insumo"
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value as CategoriaInsumo)}
                className="w-full rounded-xl border border-outline bg-surface px-3.5 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
              >
                {CATEGORIAS_INSUMO.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icono} {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMostrarFormulario(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              data-testid="btn-guardar-insumo"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-on-primary bg-primary hover:bg-primary-hover transition-colors cursor-pointer"
            >
              Guardar en Almacén
            </button>
          </div>
        </form>
      )}

      {/* Barra de búsqueda y filtros */}
      <div className="bg-surface-container rounded-2xl border border-outline p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              data-testid="input-busqueda-almacen"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar guarnición o insumo (ej. Aceitunas, Lima, Menta)..."
              className="w-full rounded-xl border border-outline bg-surface px-3.5 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-outline">
            <button
              type="button"
              data-testid="filtro-almacen-todos"
              onClick={() => setFiltroDisponibilidad('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filtroDisponibilidad === 'todos'
                  ? 'bg-surface-container-high text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Todos ({contadores.total})
            </button>
            <button
              type="button"
              data-testid="filtro-almacen-disponibles"
              onClick={() => setFiltroDisponibilidad('disponibles')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filtroDisponibilidad === 'disponibles'
                  ? 'bg-status-emerald text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              ✓ Tengo ({contadores.disponibles})
            </button>
            <button
              type="button"
              data-testid="filtro-almacen-faltantes"
              onClick={() => setFiltroDisponibilidad('faltantes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filtroDisponibilidad === 'faltantes'
                  ? 'bg-on-surface text-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              ✕ No tengo ({contadores.faltantes})
            </button>
          </div>
        </div>

        {/* Píldoras de categoría */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <button
            type="button"
            onClick={() => setFiltroCategoria('todas')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filtroCategoria === 'todas'
                ? 'bg-primary/15 text-primary font-semibold border border-primary/30'
                : 'bg-surface text-on-surface-variant hover:bg-surface-container-high border border-outline'
            }`}
          >
            Todas las categorías
          </button>
          {CATEGORIAS_INSUMO.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setFiltroCategoria(cat.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filtroCategoria === cat.value
                  ? 'bg-primary/15 text-primary font-semibold border border-primary/30'
                  : 'bg-surface text-on-surface-variant hover:bg-surface-container-high border border-outline'
              }`}
            >
              {cat.icono} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grilla de Insumos */}
      {insumosFiltrados.length === 0 ? (
        <div className="bg-surface-container rounded-2xl border border-outline p-8 text-center text-on-surface-variant text-sm">
          No se encontraron insumos o guarniciones con los filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {insumosFiltrados.map((insumo) => (
            <div
              key={insumo.id}
              data-testid={`card-insumo-${insumo.id}`}
              className={`rounded-2xl border p-4 transition-all flex items-center justify-between gap-3 ${
                insumo.disponible
                  ? 'bg-status-emerald/5 border-status-emerald/40 shadow-xs'
                  : 'bg-surface-container border-outline opacity-85'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-base" aria-hidden="true">
                    {obtenerIconoCategoriaInsumo(insumo.categoria)}
                  </span>
                  <span className="text-[11px] font-medium text-on-surface-variant truncate">
                    {obtenerLabelCategoriaInsumo(insumo.categoria)}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-on-surface mt-0.5 truncate">
                  {insumo.nombre}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  data-testid={`toggle-insumo-${insumo.id}`}
                  onClick={() => onToggleDisponible(insumo.id)}
                  aria-pressed={insumo.disponible}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    insumo.disponible
                      ? 'bg-status-emerald text-white hover:opacity-90 shadow-xs'
                      : 'bg-surface text-on-surface-variant hover:bg-surface-container-high border border-outline'
                  }`}
                >
                  {insumo.disponible ? (
                    <>
                      <span>✓</span>
                      <span>Tengo</span>
                    </>
                  ) : (
                    <>
                      <span>✕</span>
                      <span>No tengo</span>
                    </>
                  )}
                </button>

                {!insumo.esPredeterminado && (
                  <button
                    type="button"
                    data-testid={`btn-eliminar-insumo-${insumo.id}`}
                    onClick={() => onEliminarInsumo(insumo.id)}
                    title="Eliminar insumo personalizado"
                    className="p-1.5 text-on-surface-variant hover:text-status-rose rounded-lg hover:bg-status-rose/10 transition-colors cursor-pointer"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
