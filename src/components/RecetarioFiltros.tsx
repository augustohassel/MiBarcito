import React from 'react';
import { Receta } from '../domain/models/receta';

export type FiltroSeccionRecetario =
  | 'todas'
  | 'armar_hoy'
  | 'casi_listos'
  | 'favoritas'
  | 'propias';

export type CriterioOrdenRecetario =
  | 'relevancia'
  | 'rating_desc'
  | 'rating_asc'
  | 'nombre_asc';

/**
 * Ordena las recetas evaluadas manteniendo intacto el orden de relevancia por defecto
 * y dejando los tragos sin calificar siempre al final cuando se ordena por rating.
 */
export function ordenarRecetasEvaluadas<
  T extends { receta: Pick<Receta, 'nombre' | 'rating'> }
>(items: T[], orden: CriterioOrdenRecetario): T[] {
  if (orden === 'relevancia') {
    return items;
  }
  const copia = [...items];
  if (orden === 'nombre_asc') {
    return copia.sort((a, b) =>
      a.receta.nombre.localeCompare(b.receta.nombre, 'es', { sensitivity: 'base' })
    );
  }
  return copia.sort((a, b) => {
    const rA = a.receta.rating;
    const rB = b.receta.rating;
    if (rA !== rB) {
      if (rA === undefined) return 1;
      if (rB === undefined) return -1;
      return orden === 'rating_desc' ? rB - rA : rA - rB;
    }
    return a.receta.nombre.localeCompare(b.receta.nombre, 'es', { sensitivity: 'base' });
  });
}

export interface RecetarioFiltrosProps {
  busqueda: string;
  onBusquedaChange: (val: string) => void;
  filtroActivo: FiltroSeccionRecetario;
  onFiltroChange: (filtro: FiltroSeccionRecetario) => void;
  orden?: CriterioOrdenRecetario;
  onOrdenChange?: (orden: CriterioOrdenRecetario) => void;
  conteoArmables: number;
  conteoCasiListos: number;
  conteoTotal: number;
}

export const RecetarioFiltros: React.FC<RecetarioFiltrosProps> = ({
  busqueda,
  onBusquedaChange,
  filtroActivo,
  onFiltroChange,
  orden = 'relevancia',
  onOrdenChange,
  conteoArmables,
  conteoCasiListos,
  conteoTotal,
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Buscador y Selector de Ordenamiento */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar por trago, destilado o ingrediente (ej. Gin, Fernet, Bitter)..."
            data-testid="input-busqueda-receta"
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-surface-container border border-outline text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => onBusquedaChange('')}
              aria-label="Limpiar búsqueda"
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-on-surface-variant hover:text-on-surface"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {onOrdenChange && (
          <div className="flex items-center gap-1.5 bg-surface-container border border-outline rounded-2xl px-3 py-2 shrink-0">
            <label
              htmlFor="orden-recetario-select"
              className="text-xs text-on-surface-variant whitespace-nowrap"
            >
              Ordenar:
            </label>
            <select
              id="orden-recetario-select"
              aria-label="Ordenar recetas"
              data-testid="select-orden-recetario"
              value={orden}
              onChange={(e) => onOrdenChange(e.target.value as CriterioOrdenRecetario)}
              className="bg-transparent text-xs text-on-surface focus:outline-none cursor-pointer pr-1"
            >
              <option value="relevancia">Disponibilidad (Recomendado)</option>
              <option value="rating_desc">Mejor calificadas</option>
              <option value="rating_asc">Menor calificadas</option>
              <option value="nombre_asc">Nombre (A - Z)</option>
            </select>
          </div>
        )}
      </div>

      {/* Chips de Filtro Rápido */}
      <div className="flex flex-wrap items-center gap-2 pt-1" role="tablist">
        <button
          type="button"
          onClick={() => onFiltroChange('todas')}
          data-testid="filtro-recetas-todas"
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            filtroActivo === 'todas'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'bg-surface-container border border-outline text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          Todas
          <span className="opacity-80">({conteoTotal})</span>
        </button>

        <button
          type="button"
          onClick={() => onFiltroChange('armar_hoy')}
          data-testid="filtro-recetas-armar-hoy"
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            filtroActivo === 'armar_hoy'
              ? 'bg-status-emerald text-white shadow-xs'
              : 'bg-surface-container border border-outline text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          🍸 ¿Qué puedo armar hoy?
          <span className="font-bold">({conteoArmables})</span>
        </button>

        <button
          type="button"
          onClick={() => onFiltroChange('casi_listos')}
          data-testid="filtro-recetas-casi-listos"
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            filtroActivo === 'casi_listos'
              ? 'bg-status-amber text-neutral-900 shadow-xs'
              : 'bg-surface-container border border-outline text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          ⏳ Casi listos
          <span>({conteoCasiListos})</span>
        </button>

        <button
          type="button"
          onClick={() => onFiltroChange('favoritas')}
          data-testid="filtro-recetas-favoritas"
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            filtroActivo === 'favoritas'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'bg-surface-container border border-outline text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          ♥ Favoritas
        </button>

        <button
          type="button"
          onClick={() => onFiltroChange('propias')}
          data-testid="filtro-recetas-propias"
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            filtroActivo === 'propias'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'bg-surface-container border border-outline text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          ✨ Mis recetas de autor
        </button>
      </div>
    </div>
  );
};

