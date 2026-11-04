import React, { useEffect } from 'react';
import { Bebida } from '../domain/models/bebida';
import { BebidaAlertaStock } from '../domain/services/metricas-bar';
import { useCategoriasOpcional } from '../context/InventoryContext';
import { CATEGORIAS_BEBIDA } from '../domain/models/bebida';

export interface AlertasStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  alertas: BebidaAlertaStock[];
  onEditarBebida?: (bebida: Bebida) => void;
  onAjustarVolumen?: (bebida: Bebida, nuevoVolumenMl: number) => void;
}

export const AlertasStockModal: React.FC<AlertasStockModalProps> = ({
  isOpen,
  onClose,
  alertas,
  onEditarBebida,
  onAjustarVolumen,
}) => {
  const categoriasCtx = useCategoriasOpcional();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const obtenerNombreCategoria = (catId: string): string => {
    const dinamica = categoriasCtx?.categorias.find((c) => c.id === catId);
    if (dinamica) return dinamica.nombre;
    const estatica = CATEGORIAS_BEBIDA.find((c) => c.value === catId);
    return estatica?.label || catId;
  };

  const handleRellenarTotal = (bebida: Bebida) => {
    if (onAjustarVolumen) {
      onAjustarVolumen(bebida, bebida.volumenTotalMl);
    }
  };

  const handleSumarVolumen = (bebida: Bebida, deltaMl: number) => {
    if (onAjustarVolumen) {
      const nuevoVolumen = Math.min(
        bebida.volumenTotalMl,
        Math.max(0, bebida.volumenRestanteMl + deltaMl)
      );
      onAjustarVolumen(bebida, nuevoVolumen);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alertas-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface-container border border-outline rounded-2xl shadow-xl p-6 text-on-surface flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between gap-3 border-b border-outline pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="alertas-modal-title" className="text-lg font-bold text-on-surface">
                  Alertas de Stock Bajo
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-status-amber/20 text-status-amber border border-status-amber/30">
                  {alertas.length} {alertas.length === 1 ? 'botella' : 'botellas'}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Bebidas que requieren reposición o compra próxima
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de alertas"
            className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Contenido principal */}
        {alertas.length === 0 ? (
          <div className="py-8 px-4 text-center bg-surface rounded-xl border border-outline flex flex-col items-center gap-2">
            <span className="text-3xl">🎉</span>
            <h4 className="text-sm font-bold text-on-surface">¡Todo en orden en tu bar!</h4>
            <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
              Ninguna bebida está por debajo de su umbral mínimo de stock.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alertas.map(({ bebida, stockMinimoMl, volumenRestanteMl, volumenFaltanteMl, porcentajeRestante }) => (
              <div
                key={bebida.id}
                data-testid={`alerta-item-${bebida.id}`}
                className="p-4 rounded-xl bg-surface-container-high border border-status-amber/40 shadow-xs flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface text-primary border border-outline">
                        {obtenerNombreCategoria(bebida.categoria)}
                      </span>
                      <span className="text-[10px] font-bold text-status-amber">
                        Restan {volumenRestanteMl} ml
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-on-surface mt-1 truncate" title={bebida.nombre}>
                      {bebida.nombre}
                    </h4>
                    <p className="text-xs text-on-surface-variant truncate" title={bebida.marca}>
                      {bebida.marca}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-status-amber block">
                      {porcentajeRestante}%
                    </span>
                    <span className="text-[10px] text-on-surface-variant">
                      Umbral: {stockMinimoMl} ml
                    </span>
                  </div>
                </div>

                {/* Barra de volumen visual */}
                <div>
                  <div className="w-full h-2 rounded-full bg-surface border border-outline overflow-hidden">
                    <div
                      className="h-full bg-status-amber rounded-full transition-all duration-200"
                      style={{ width: `${Math.max(3, porcentajeRestante)}%` }}
                    />
                  </div>
                  {volumenFaltanteMl > 0 && (
                    <p className="text-[11px] text-on-surface-variant mt-1">
                      Faltan <span className="font-semibold text-status-amber">{volumenFaltanteMl} ml</span> para alcanzar el stock mínimo.
                    </p>
                  )}
                </div>

                {/* Acciones Rápidas de Reposición */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-outline/50 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSumarVolumen(bebida, 250)}
                      className="px-2 py-1 text-[11px] font-medium bg-surface hover:bg-surface-container border border-outline rounded-lg text-on-surface transition-colors cursor-pointer"
                      title="Sumar 250 ml"
                    >
                      +250 ml
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRellenarTotal(bebida)}
                      className="px-2 py-1 text-[11px] font-medium bg-surface hover:bg-surface-container border border-outline rounded-lg text-on-surface transition-colors cursor-pointer"
                      title="Rellenar a capacidad completa"
                    >
                      Botella Llena ({bebida.volumenTotalMl} ml)
                    </button>
                  </div>

                  {onEditarBebida && (
                    <button
                      type="button"
                      onClick={() => {
                        onEditarBebida(bebida);
                        onClose();
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary-container rounded-lg transition-colors cursor-pointer ml-auto"
                    >
                      Editar Ficha ✏️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botón de Cierre */}
        <div className="flex items-center justify-end pt-2 border-t border-outline">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold bg-surface-container-high hover:bg-surface border border-outline text-on-surface rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
