import React from 'react';
import { useCategoriasOpcional } from '../context/InventoryContext';
import {
  Bebida,
  ajustarVolumenRapido,
  calcularPorcentajeRestante,
  CATEGORIAS_BEBIDA,
  estaEnAlertaStockBajo,
} from '../domain/models/bebida';

export interface BebidaCardProps {
  bebida: Bebida;
  onEditar: (bebida: Bebida) => void;
  onEliminar: (bebida: Bebida) => void;
  onToggleFavorito: (bebida: Bebida) => void;
  onAjustarVolumen: (bebida: Bebida, nuevoVolumenMl: number) => void;
}

export const BebidaCard: React.FC<BebidaCardProps> = ({
  bebida,
  onEditar,
  onEliminar,
  onToggleFavorito,
  onAjustarVolumen,
}) => {
  const porcentaje = calcularPorcentajeRestante(bebida);
  const bajoStock = estaEnAlertaStockBajo(bebida);
  const categoriasCtx = useCategoriasOpcional();
  const categoriaObj = categoriasCtx?.categorias.find((c) => c.id === bebida.categoria);
  const categoriaLabel =
    categoriaObj?.nombre ||
    CATEGORIAS_BEBIDA.find((c) => c.value === bebida.categoria)?.label ||
    bebida.categoria;

  const handleModificarVolumen = (deltaMl: number) => {
    const nuevoVolumen = ajustarVolumenRapido(
      bebida.volumenRestanteMl,
      bebida.volumenTotalMl,
      deltaMl
    );
    if (nuevoVolumen !== bebida.volumenRestanteMl) {
      onAjustarVolumen(bebida, nuevoVolumen);
    }
  };

  const handleSetVolumenFijo = (porcentajeDeseado: number) => {
    const nuevoVolumen = Math.round((bebida.volumenTotalMl * porcentajeDeseado) / 100);
    if (nuevoVolumen !== bebida.volumenRestanteMl) {
      onAjustarVolumen(bebida, nuevoVolumen);
    }
  };

  return (
    <div
      data-testid={`bebida-card-${bebida.id}`}
      className={`p-5 rounded-2xl bg-slate-900/70 border transition-all duration-200 flex flex-col justify-between gap-4 shadow-lg hover:border-slate-700/80 ${
        bajoStock
          ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-slate-900/80'
          : 'border-slate-800'
      }`}
    >
      {/* Encabezado: Nombre, Marca, Favorito y Badges */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-sky-300 border border-slate-700">
                {categoriaLabel}
              </span>
              {bajoStock && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  ⚠️ Stock Bajo
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white mt-1.5 truncate" title={bebida.nombre}>
              {bebida.nombre}
            </h3>
            <p className="text-xs text-slate-400 truncate" title={bebida.marca}>
              {bebida.marca}
            </p>
          </div>

          {/* Botón Favorito */}
          <button
            type="button"
            onClick={() => onToggleFavorito(bebida)}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer text-base ${
              bebida.esFavorito
                ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20'
                : 'text-slate-500 hover:text-slate-300 bg-slate-800/40 border border-slate-800'
            }`}
            aria-label={bebida.esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            title={bebida.esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            {bebida.esFavorito ? '★' : '☆'}
          </button>
        </div>

        {/* Barra de progreso de volumen */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400">Nivel de botella</span>
            <span className="font-semibold text-slate-200">
              {bebida.volumenRestanteMl} / {bebida.volumenTotalMl} ml ({porcentaje}%)
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                bajoStock
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                  : 'bg-gradient-to-r from-sky-500 to-indigo-500'
              }`}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>

        {/* Ajuste rápido de volumen */}
        <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
          <span className="text-[11px] text-slate-400">Ajuste rápido:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={bebida.volumenRestanteMl <= 0}
              onClick={() => handleModificarVolumen(-50)}
              className="px-2 py-0.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Restar 50 ml"
            >
              -50 ml
            </button>
            <button
              type="button"
              disabled={bebida.volumenRestanteMl >= bebida.volumenTotalMl}
              onClick={() => handleModificarVolumen(50)}
              className="px-2 py-0.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Sumar 50 ml"
            >
              +50 ml
            </button>
            <button
              type="button"
              onClick={() => handleSetVolumenFijo(100)}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded-lg bg-slate-950 hover:bg-slate-800 text-sky-400 border border-slate-800 transition-colors cursor-pointer"
              title="Llenar al 100%"
            >
              100%
            </button>
          </div>
        </div>

        {/* Metadatos adicionales (Graduación, Precio, Alerta) */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-2 text-[11px] text-slate-400 border-t border-slate-800/40">
          <div>
            <span className="text-slate-500">Graduación: </span>
            <span className="text-slate-300 font-medium">
              {bebida.graduacionAlcoholica !== undefined ? `${bebida.graduacionAlcoholica}% ABV` : 'N/D'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Precio est.: </span>
            <span className="text-slate-300 font-medium">
              {bebida.precioEstimado !== undefined
                ? `$${bebida.precioEstimado.toLocaleString('es-AR')}`
                : 'N/D'}
            </span>
          </div>
        </div>
      </div>

      {/* Acciones de Edición y Eliminación */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
        <button
          type="button"
          onClick={() => onEditar(bebida)}
          className="px-3 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700 border border-slate-700/80 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>✏️</span>
          <span>Editar</span>
        </button>
        <button
          type="button"
          onClick={() => onEliminar(bebida)}
          className="px-3 py-1 text-xs font-medium text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>🗑️</span>
          <span>Eliminar</span>
        </button>
      </div>
    </div>
  );
};

