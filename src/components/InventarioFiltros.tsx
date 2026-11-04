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
    // Filtro por texto (nombre, marca o subcategoría)
    if (query) {
      const coincideNombre = b.nombre.toLowerCase().includes(query);
      const coincideMarca = b.marca.toLowerCase().includes(query);
      const coincideSubcat = b.subcategoria?.toLowerCase().includes(query) ?? false;
      if (!coincideNombre && !coincideMarca && !coincideSubcat) return false;
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
    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-surface-container border border-outline shadow-xs">
      {/* Buscador y Controles Superiores */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Input Buscador */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant pointer-events-none text-sm">
            🔍
          </span>
          <input
            type="text"
            value={filtros.busqueda}
            onChange={handleBusquedaChange}
            placeholder="Buscar por nombre o marca..."
            className="w-full pl-9 pr-8 py-2 bg-surface border border-outline rounded-xl text-sm text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
          />
          {filtros.busqueda && (
            <button
              type="button"
              onClick={() => onChange({ ...filtros, busqueda: '' })}
              className="absolute inset-y-0 right-2.5 flex items-center text-on-surface-variant hover:text-on-surface text-xs cursor-pointer"
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
                ? 'bg-status-amber/20 text-status-amber border-status-amber/40 shadow-xs'
                : 'bg-surface text-on-surface-variant border-outline hover:text-on-surface'
            }`}
          >
            <span>{filtros.soloFavoritos ? '⭐' : '☆'}</span>
            <span>Solo Favoritos</span>
          </button>

          <div className="flex items-center gap-1.5 bg-surface border border-outline rounded-xl px-2.5 py-1.5">
            <label htmlFor="orden-select" className="text-xs text-on-surface-variant whitespace-nowrap">
              Ordenar:
            </label>
            <select
              id="orden-select"
              value={filtros.orden}
              onChange={handleOrdenChange}
              className="bg-transparent text-xs text-on-surface focus:outline-none cursor-pointer pr-1"
            >
              <option value="nombre_asc">Nombre (A - Z)</option>
              <option value="nombre_desc">Nombre (Z - A)</option>
              <option value="volumen_desc">Volumen restante (Mayor)</option>
              <option value="volumen_asc">Volumen restante (Menor)</option>
              <option value="precio_desc">Precio (Mayor)</option>
              <option value="precio_asc">Precio (Menor)</option>
              <option value="fecha_desc">Fecha de alta (Más reciente)</option>
              <option value="fecha_asc">Fecha de alta (Más antiguo)</option>
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
              ? 'bg-primary text-on-primary border-primary font-semibold shadow-xs'
              : 'bg-surface text-on-surface-variant border-outline hover:text-on-surface'
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
                ? 'bg-primary text-on-primary border-primary font-semibold shadow-xs'
                : 'bg-surface text-on-surface-variant border-outline hover:text-on-surface'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Conteo de Resultados y botón limpiar */}
      <div className="flex items-center justify-between text-xs text-on-surface-variant pt-1 border-t border-outline/70">
        <span>
          Mostrando <strong className="text-on-surface">{totalResultados}</strong> de {totalBebidas} botellas
        </span>
        {hayFiltrosActivos && (
          <button
            type="button"
            onClick={handleLimpiarFiltros}
            className="text-primary hover:text-primary-hover underline cursor-pointer"
          >
            Restablecer filtros
          </button>
        )}
      </div>
    </div>
  );
};
