import React, { useEffect } from 'react';
import { MetricasValoracion } from '../domain/services/metricas-bar';

export interface MetricasValoracionModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricas: MetricasValoracion;
}

export const MetricasValoracionModal: React.FC<MetricasValoracionModalProps> = ({
  isOpen,
  onClose,
  metricas,
}) => {
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

  const formatearDinero = (monto: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(monto);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="metricas-modal-title"
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
            <span className="text-2xl">💰</span>
            <div>
              <h3 id="metricas-modal-title" className="text-lg font-bold text-on-surface">
                Valoración del Bar
              </h3>
              <p className="text-xs text-on-surface-variant">
                Resumen financiero e inversión acumulada en tu despensa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de métricas"
            className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tarjetas de Resumen Principal */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Valor Actual en Líquido (Prorrateado) */}
          <div className="p-4 rounded-xl bg-surface-container-high border border-outline flex flex-col justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Valor Actual en Líquido</span>
            <span className="text-2xl font-black text-primary mt-1">
              {formatearDinero(metricas.valorActualProrrateado ?? metricas.costoTotal)}
            </span>
            <span className="text-[11px] text-on-surface-variant mt-1">
              Prorrateado por líquido restante
            </span>
          </div>

          {/* Inversión a Capacidad Plena */}
          <div className="p-4 rounded-xl bg-surface-container-high border border-outline flex flex-col justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Capacidad Plena (100%)</span>
            <span className="text-2xl font-bold text-on-surface mt-1">
              {formatearDinero(metricas.costoTotalLleno ?? metricas.costoTotal)}
            </span>
            <span className="text-[11px] text-on-surface-variant mt-1">
              Inversión total si estuviesen llenas
            </span>
          </div>

          {/* Costo Estimado de Reposición */}
          <div className="p-4 rounded-xl bg-surface-container-high border border-outline flex flex-col justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Costo de Reposición</span>
            <span className="text-2xl font-bold text-status-amber mt-1">
              {formatearDinero(metricas.costoReposicion ?? 0)}
            </span>
            <span className="text-[11px] text-on-surface-variant mt-1">
              {metricas.botellasPorReponer ?? 0} {metricas.botellasPorReponer === 1 ? 'botella por reponer' : 'botellas por reponer'}
            </span>
          </div>
        </div>

        {/* Cobertura de Precios e Historial */}
        <div className="p-3 rounded-xl bg-surface-container-high/60 border border-outline/70 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface">Cobertura de precios:</span>
            <span className="text-on-surface-variant">
              {metricas.botellasCotizadas} de {metricas.totalBotellas} botella(s) cotizadas ({metricas.totalBotellas > 0 ? Math.round((metricas.botellasCotizadas / metricas.totalBotellas) * 100) : 0}%)
            </span>
          </div>
          {metricas.botellasArchivadas !== undefined && metricas.botellasArchivadas > 0 && (
            <span className="text-[11px] text-on-surface-variant bg-surface px-2 py-0.5 rounded-md border border-outline">
              📦 {metricas.botellasArchivadas} archivada(s)
            </span>
          )}
        </div>

        {/* Advertencia informativa de botellas en reposición sin precio */}
        {(metricas.botellasReposicionSinPrecio ?? 0) > 0 && (
          <div
            data-testid="aviso-reposicion-sin-precio"
            className="p-3 rounded-xl bg-status-amber/10 border border-status-amber/30 text-on-surface text-xs flex items-start gap-2.5"
          >
            <span className="text-status-amber text-base leading-none">⚠️</span>
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold text-status-amber">
                {metricas.botellasReposicionSinPrecio} {metricas.botellasReposicionSinPrecio === 1 ? 'botella por reponer' : 'botellas por reponer'} sin cotización
              </span>
              : El costo de reposición sólo suma las botellas que tienen precio estimado registrado.
            </div>
          </div>
        )}

        {/* Advertencia informativa de botellas sin precio (Criterio de Aceptación / Caso de falla) */}
        {metricas.botellasSinPrecio > 0 && (
          <div
            data-testid="aviso-botellas-sin-precio"
            className="p-3 rounded-xl bg-status-amber/10 border border-status-amber/30 text-on-surface text-xs flex items-start gap-2.5"
          >
            <span className="text-status-amber text-base leading-none">⚠️</span>
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold text-status-amber">
                {metricas.botellasSinPrecio} {metricas.botellasSinPrecio === 1 ? 'botella' : 'botellas'} sin precio estimado
              </span>
              : El costo total sólo suma las botellas que cuentan con un precio registrado. Puedes editar cada botella para asignar su cotización.
            </div>
          </div>
        )}

        {/* Desglose por Categoría */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-on-surface">
              Distribución del Valor por Categoría
            </h4>
            <span className="text-xs text-on-surface-variant">
              {metricas.distribucionCategorias.length} {metricas.distribucionCategorias.length === 1 ? 'categoría' : 'categorías'}
            </span>
          </div>

          {metricas.distribucionCategorias.length === 0 ? (
            <p className="text-xs text-on-surface-variant text-center py-4 bg-surface rounded-xl border border-outline">
              No hay bebidas registradas en la despensa.
            </p>
          ) : (
            <div className="space-y-3">
              {metricas.distribucionCategorias.map((item) => (
                <div
                  key={item.categoriaId}
                  className="p-3 rounded-xl bg-surface-container-high/60 border border-outline/70 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-on-surface flex items-center gap-1.5">
                      {item.categoriaNombre}
                      <span className="text-[10px] text-on-surface-variant font-normal">
                        ({item.cantidadBotellas} {item.cantidadBotellas === 1 ? 'botella' : 'botellas'})
                      </span>
                    </span>
                    <span className="font-bold text-on-surface">
                      {formatearDinero(item.totalCosto)}
                      <span className="text-on-surface-variant font-normal ml-1">
                        ({item.porcentaje}%)
                      </span>
                    </span>
                  </div>

                  {/* Barra de progreso de participación */}
                  <div className="w-full h-2 rounded-full bg-surface border border-outline/50 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, item.porcentaje))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
