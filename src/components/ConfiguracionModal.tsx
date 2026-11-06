import React, { useState, useEffect } from 'react';
import { CategoriasConfig } from './CategoriasConfig';
import { AiConfigTab } from './AiConfigTab';
import { RespaldoCloudTab } from './RespaldoCloudTab';
import { Bebida } from '../domain/models/bebida';

export interface ConfiguracionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bebidas: Bebida[];
  initialTab?: TabConfig;
  onBebidasActualizadas?: () => Promise<void> | void;
}

export type TabConfig = 'categorias' | 'ia' | 'respaldo';

export const ConfiguracionModal: React.FC<ConfiguracionModalProps> = ({
  isOpen,
  onClose,
  bebidas,
  initialTab = 'categorias',
  onBebidasActualizadas,
}) => {
  const [activeTab, setActiveTab] = useState<TabConfig>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="config-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-xl bg-surface-container border border-outline rounded-2xl shadow-xl p-6 text-on-surface flex flex-col gap-5 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del Modal */}
        <div className="flex items-center justify-between border-b border-outline pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚙️</span>
            <div>
              <h3 id="config-modal-title" className="text-lg font-bold text-on-surface">
                Configuración del Bar
              </h3>
              <p className="text-xs text-on-surface-variant">
                Parámetros maestros y personalización de tu despensa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar configuración"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Barra de Pestañas (Tabs) */}
        <div className="flex border-b border-outline gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('categorias')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'categorias'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>🏷️</span>
            <span>Categorías</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ia')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ia'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>✨</span>
            <span>Inteligencia Artificial</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('respaldo')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'respaldo'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>💾</span>
            <span>Respaldo & Nube</span>
          </button>
        </div>

        {/* Contenido de la solapa activa */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'categorias' && (
            <CategoriasConfig
              bebidas={bebidas}
              onBebidasActualizadas={onBebidasActualizadas}
            />
          )}
          {activeTab === 'ia' && <AiConfigTab />}
          {activeTab === 'respaldo' && (
            <RespaldoCloudTab
              bebidas={bebidas}
              onInventarioActualizado={onBebidasActualizadas}
            />
          )}
        </div>
      </div>
    </div>
  );
};
