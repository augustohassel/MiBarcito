import React from 'react';
import { useCategoriasOpcional } from '../context/InventoryContext';
import {
  Bebida,
  ajustarVolumenRapido,
  calcularPorcentajeRestante,
  CATEGORIAS_BEBIDA,
  estaEnAlertaStockBajo,
} from '../domain/models/bebida';
import { CATEGORIAS_PREDETERMINADAS } from '../domain/models/categoria';

export interface BebidaCardProps {
  bebida: Bebida;
  onEditar: (bebida: Bebida) => void;
  onEliminar: (bebida: Bebida) => void;
  onToggleFavorito: (bebida: Bebida) => void;
  onAjustarVolumen: (bebida: Bebida, nuevoVolumenMl: number) => void;
  onVerFicha?: (bebida: Bebida) => void;
  onToggleArchivar?: (bebida: Bebida) => void;
}

export const BebidaCard: React.FC<BebidaCardProps> = ({
  bebida,
  onEditar,
  onEliminar,
  onToggleFavorito,
  onAjustarVolumen,
  onVerFicha,
  onToggleArchivar,
}) => {
  const porcentaje = calcularPorcentajeRestante(bebida);
  const bajoStock = estaEnAlertaStockBajo(bebida);
  const categoriasCtx = useCategoriasOpcional();
  const categoriaObj = categoriasCtx?.categorias.find((c) => c.id === bebida.categoria);
  const categoriaLabel =
    categoriaObj?.nombre ||
    CATEGORIAS_BEBIDA.find((c) => c.value === bebida.categoria)?.label ||
    bebida.categoria;

  const subcategoriasValidas =
    categoriaObj?.subcategorias ??
    CATEGORIAS_PREDETERMINADAS.find((c) => c.id === bebida.categoria)?.subcategorias ??
    [];
  const esSubcategoriaValida = Boolean(
    bebida.subcategoria && subcategoriasValidas.includes(bebida.subcategoria)
  );

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
      className={`p-5 rounded-2xl bg-surface-container border transition-all duration-200 flex flex-col justify-between gap-4 shadow-xs hover:border-primary/40 overflow-hidden ${
        bebida.archivada
          ? 'opacity-75 border-outline/50 bg-surface-container-low'
          : bajoStock
          ? 'border-status-amber/50 bg-gradient-to-b from-status-amber/10 to-surface-container'
          : 'border-outline'
      }`}
    >
      {/* Encabezado: Nombre, Marca, Favorito y Badges */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div
            className={`flex-1 min-w-0 ${onVerFicha ? 'cursor-pointer group/title' : ''}`}
            onClick={() => onVerFicha?.(bebida)}
            role={onVerFicha ? 'button' : undefined}
            tabIndex={onVerFicha ? 0 : undefined}
            onKeyDown={(e) => {
              if (onVerFicha && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onVerFicha(bebida);
              }
            }}
            aria-label={onVerFicha ? `Abrir ficha técnica de ${bebida.nombre}` : undefined}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-container-high text-primary border border-outline">
                {categoriaLabel}
              </span>
              {esSubcategoriaValida && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-surface-container-high text-secondary border border-outline">
                  {bebida.subcategoria}
                </span>
              )}
              {bebida.archivada && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-surface text-on-surface-variant border border-outline flex items-center gap-1">
                  📦 Archivada
                </span>
              )}
              {bajoStock && !bebida.archivada && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-status-amber/20 text-status-amber border border-status-amber/30 flex items-center gap-1">
                  ⚠️ Stock Bajo
                </span>
              )}
              {bebida.recomprar === true && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-status-amber/15 text-status-amber border border-status-amber/30">
                  Recomprar
                </span>
              )}
              {bebida.recomprar === false && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-surface text-on-surface-variant border border-outline">
                  No recomprar
                </span>
              )}
            </div>
            <h3
              className={`text-base font-bold text-on-surface mt-1.5 leading-snug line-clamp-2 break-words ${
                onVerFicha ? 'group-hover/title:text-primary transition-colors' : ''
              }`}
              title={bebida.nombre}
            >
              {bebida.nombre}
            </h3>
            <p className="text-xs text-on-surface-variant line-clamp-1 break-words mt-0.5" title={bebida.marca}>
              {bebida.marca}
            </p>
            {bebida.notas && (
              <p
                data-testid="bebida-card-notas"
                className="text-[11px] text-on-surface-variant italic mt-1.5 p-1.5 rounded-lg bg-surface/60 border border-outline/40 line-clamp-2"
                title={bebida.notas}
              >
                "{bebida.notas}"
              </p>
            )}
          </div>

          {/* Botón Favorito */}
          <button
            type="button"
            onClick={() => onToggleFavorito(bebida)}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer text-base ${
              bebida.esFavorito
                ? 'text-status-amber hover:text-status-amber/80 bg-status-amber/15 border border-status-amber/30'
                : 'text-on-surface-variant hover:text-on-surface bg-surface border border-outline'
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
            <span className="text-on-surface-variant">Nivel de botella</span>
            <span className="font-semibold text-on-surface">
              {bebida.volumenRestanteMl} / {bebida.volumenTotalMl} ml ({porcentaje}%)
            </span>
          </div>

          <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden border border-outline">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                bajoStock
                  ? 'bg-gradient-to-r from-status-amber to-status-rose'
                  : 'bg-primary'
              }`}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>

        {/* Ajuste rápido de volumen */}
        <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-outline/70">
          <span className="text-[11px] text-on-surface-variant">Ajuste rápido:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={bebida.volumenRestanteMl <= 0}
              onClick={() => handleModificarVolumen(-50)}
              className="px-2 py-0.5 text-xs font-semibold rounded-lg bg-surface-container-high hover:bg-surface text-on-surface border border-outline transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Restar 50 ml"
            >
              -50 ml
            </button>
            <button
              type="button"
              disabled={bebida.volumenRestanteMl >= bebida.volumenTotalMl}
              onClick={() => handleModificarVolumen(50)}
              className="px-2 py-0.5 text-xs font-semibold rounded-lg bg-surface-container-high hover:bg-surface text-on-surface border border-outline transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Sumar 50 ml"
            >
              +50 ml
            </button>
            <button
              type="button"
              onClick={() => handleSetVolumenFijo(100)}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded-lg bg-surface hover:bg-surface-container-high text-primary border border-outline transition-colors cursor-pointer"
              title="Llenar al 100%"
            >
              100%
            </button>
          </div>
        </div>

        {/* Metadatos adicionales (Graduación, Precio, Alerta) */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-2 text-[11px] text-on-surface-variant border-t border-outline/50">
          <div>
            <span className="text-on-surface-variant opacity-80">Graduación: </span>
            <span className="text-on-surface font-medium">
              {bebida.graduacionAlcoholica !== undefined ? `${bebida.graduacionAlcoholica}% ABV` : 'N/D'}
            </span>
          </div>
          <div>
            <span className="text-on-surface-variant opacity-80">Precio est.: </span>
            <span className="text-on-surface font-medium">
              {bebida.precioEstimado !== undefined
                ? `$${bebida.precioEstimado.toLocaleString('es-AR')}`
                : 'N/D'}
            </span>
          </div>
        </div>
      </div>

      {/* Acciones de Ficha, Archivado, Edición y Eliminación */}
      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-outline/70 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {onVerFicha && (
            <button
              type="button"
              onClick={() => onVerFicha(bebida)}
              className="px-2.5 py-1 text-xs font-medium text-on-surface hover:text-primary bg-surface-container-high hover:bg-surface border border-outline rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              aria-label={`Ver ficha técnica de ${bebida.nombre}`}
            >
              <span>📋</span>
              <span>Ficha</span>
            </button>
          )}
          {onToggleArchivar && (
            <button
              type="button"
              onClick={() => onToggleArchivar(bebida)}
              className={`px-2.5 py-1 text-xs font-medium border rounded-xl transition-colors cursor-pointer flex items-center gap-1 ${
                bebida.archivada
                  ? 'text-primary bg-primary/10 hover:bg-primary/20 border-primary/30'
                  : 'text-on-surface-variant hover:text-on-surface bg-surface-container-high hover:bg-surface border border-outline'
              }`}
              title={bebida.archivada ? 'Desarchivar botella' : 'Archivar botella'}
            >
              <span>{bebida.archivada ? '📤' : '📦'}</span>
              <span>{bebida.archivada ? 'Desarchivar' : 'Archivar'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
          <button
            type="button"
            onClick={() => onEditar(bebida)}
            className="px-2.5 py-1 text-xs font-medium text-on-surface hover:text-primary bg-surface-container-high hover:bg-surface border border-outline rounded-xl transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>✏️</span>
            <span>Editar</span>
          </button>
          <button
            type="button"
            onClick={() => onEliminar(bebida)}
            className="px-2.5 py-1 text-xs font-medium text-status-rose hover:bg-status-rose/15 bg-status-rose/10 border border-status-rose/30 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>🗑️</span>
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
