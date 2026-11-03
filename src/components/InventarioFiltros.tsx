import React, { useMemo } from 'react';
import { useCategoriasOpcional } from '../context/InventoryContext';
import {
  Bebida,
  CategoriaBebida,
  CATEGORIAS_BEBIDA,
} from '../domain/models/bebida';

export type CriterioOrden =
  | 'nombre_asc'
  | 'nombre_desc'
  | 'volumen_asc'
  | 'volumen_desc'
  | 'precio_asc'
  | 'precio_desc'
  | 'fecha_desc'
  | 'fecha_asc';

export interface FiltrosEstado {
  busqueda: string;
  categoria: CategoriaBebida | 'todas';
  soloFavoritos: boolean;
  orden: CriterioOrden;
}

export interface InventarioFiltrosProps {
  filtros: FiltrosEstado;
  onChange: (nuevosFiltros: FiltrosEstado) => void;
  totalResultados: number;
  totalBebidas: number;
}

/**
 * Función pura que filtra y ordena una lista de bebidas en memoria.
 * Garantiza respuesta fluida y reactiva sin llamadas de red ni recargas.
 */
export function filtrarYOrdenarBebidas(
  bebidas: Bebida[],
  filtros: FiltrosEstado
): Bebida[] {
  const query = filtros.busqueda.trim().toLowerCase();

  const filtradas = bebidas.filter((b) => {
    // Filtro por texto (nombre o marca)
    if (query) {
      const coincideNombre = b.nombre.toLowerCase().includes(query);
      const coincideMarca = b.marca.toLowerCase().includes(query);
      if (!coincideNombre && !coincideMarca) return false;
    }

    // Filtro por categoría
    if (filtros.categoria !== 'todas' && b.categoria !== filtros.categoria) {
      return false;
    }

    // Filtro por favoritos
    if (filtros.soloFavoritos && !b.esFavorito) {
      return false;
    }

    return true;
  });

  return filtradas.sort((a, b) => {
    switch (filtros.orden) {
      case 'nombre_asc':
        return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
      case 'nombre_desc':
        return b.nombre.localeCompare(a.nombre, 'es', { sensitivity: 'base' });
      case 'volumen_asc':
        return a.volumenRestanteMl - b.volumenRestanteMl;
      case 'volumen_desc':
        return b.volumenRestanteMl - a.volumenRestanteMl;
      case 'precio_asc':
        return (a.precioEstimado ?? 0) - (b.precioEstimado ?? 0);
      case 'precio_desc':
        return (b.precioEstimado ?? 0) - (a.precioEstimado ?? 0);
      case 'fecha_desc':
        return new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime();
      case 'fecha_asc':
        return new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime();
      default:
        return 0;
    }
  });
}

export const InventarioFiltros: React.FC<InventarioFiltrosProps> = ({
  filtros,
  onChange,
  totalResultados,
  totalBebidas,
}) => {
  const categoriasCtx = useCategoriasOpcional();
  const listaCategorias = useMemo(() => {
    return categoriasCtx && categoriasCtx.categorias.length > 0
      ? categoriasCtx.categorias.map((c) => ({ value: c.id, label: c.nombre }))
      : CATEGORIAS_BEBIDA;
  }, [categoriasCtx?.categorias]);

  const handleBusquedaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filtros, busqueda: e.target.value });
  };

  const handleCategoriaChange = (categoria: CategoriaBebida | 'todas') => {
    onChange({ ...filtros, categoria });
  };

  const handleToggleFavoritos = () => {
    onChange({ ...filtros, soloFavoritos: !filtros.soloFavoritos });
  };

  const handleOrdenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filtros, orden: e.target.value as CriterioOrden });
  };

  const handleLimpiarFiltros = () => {
    onChange({
      busqueda: '',
      categoria: 'todas',
      soloFavoritos: false,
      orden: 'nombre_asc',
    });
  };

  const hayFiltrosActivos =
    filtros.busqueda !== '' ||
    filtros.categoria !== 'todas' ||
    filtros.soloFavoritos;

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
      {/* Buscador y Controles Superiores */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Input Buscador */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none text-sm">
            🔍
          </span>
          <input
            type="text"
            value={filtros.busqueda}
            onChange={handleBusquedaChange}
            placeholder="Buscar por nombre o marca..."
            className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
          />
          {filtros.busqueda && (
            <button
              type="button"
              onClick={() => onChange({ ...filtros, busqueda: '' })}
              className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-white text-xs cursor-pointer"
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        {/* Toggle Favoritos y Selector de Orden */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleFavoritos}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              filtros.soloFavoritos
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <span>{filtros.soloFavoritos ? '⭐' : '☆'}</span>
            <span>Solo Favoritos</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <label htmlFor="orden-select" className="text-xs text-slate-400 whitespace-nowrap">
              Ordenar:
            </label>
            <select
              id="orden-select"
              value={filtros.orden}
              onChange={handleOrdenChange}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-1"
            >
              <option value="nombre_asc" className="bg-slate-900">Nombre (A - Z)</option>
              <option value="nombre_desc" className="bg-slate-900">Nombre (Z - A)</option>
              <option value="volumen_desc" className="bg-slate-900">Volumen restante (Mayor)</option>
              <option value="volumen_asc" className="bg-slate-900">Volumen restante (Menor)</option>
              <option value="precio_desc" className="bg-slate-900">Precio (Mayor)</option>
              <option value="precio_asc" className="bg-slate-900">Precio (Menor)</option>
              <option value="fecha_desc" className="bg-slate-900">Fecha de alta (Más reciente)</option>
              <option value="fecha_asc" className="bg-slate-900">Fecha de alta (Más antiguo)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pills de Categorías */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          type="button"
          onClick={() => handleCategoriaChange('todas')}
          className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-colors cursor-pointer border ${
            filtros.categoria === 'todas'
              ? 'bg-sky-500 text-slate-950 border-sky-400 font-semibold shadow-sm'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          Todas
        </button>
        {listaCategorias.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => handleCategoriaChange(cat.value)}
            className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-colors cursor-pointer border ${
              filtros.categoria === cat.value
                ? 'bg-sky-500 text-slate-950 border-sky-400 font-semibold shadow-sm'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Conteo de Resultados y botón limpiar */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
        <span>
          Mostrando <strong className="text-white">{totalResultados}</strong> de {totalBebidas} botellas
        </span>
        {hayFiltrosActivos && (
          <button
            type="button"
            onClick={handleLimpiarFiltros}
            className="text-sky-400 hover:text-sky-300 underline cursor-pointer"
          >
            Restablecer filtros
          </button>
        )}
      </div>
    </div>
  );
};

