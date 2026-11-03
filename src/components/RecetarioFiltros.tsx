import React from 'react';

export type FiltroSeccionRecetario =
  | 'todas'
  | 'armar_hoy'
  | 'casi_listos'
  | 'favoritas'
  | 'propias';

export interface RecetarioFiltrosProps {
  busqueda: string;
  onBusquedaChange: (val: string) => void;
  filtroActivo: FiltroSeccionRecetario;
  onFiltroChange: (filtro: FiltroSeccionRecetario) => void;
  conteoArmables: number;
  conteoCasiListos: number;
  conteoTotal: number;
}

export const RecetarioFiltros: React.FC<RecetarioFiltrosProps> = ({
  busqueda,
  onBusquedaChange,
  filtroActivo,
  onFiltroChange,
  conteoArmables,
  conteoCasiListos,
  conteoTotal,
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Buscador */}
      <div className="relative">
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
          ⭐ Favoritas
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

