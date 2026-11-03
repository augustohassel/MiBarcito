import React, { useState, useEffect } from 'react';
import { CategoriasConfig } from './CategoriasConfig';
import { Bebida } from '../domain/models/bebida';

export interface ConfiguracionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bebidas: Bebida[];
}

type TabConfig = 'categorias' | 'respaldo';

export const ConfiguracionModal: React.FC<ConfiguracionModalProps> = ({
  isOpen,
  onClose,
  bebidas,
}) => {
  const [activeTab, setActiveTab] = useState<TabConfig>('categorias');

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚙️</span>
            <div>
              <h3 id="config-modal-title" className="text-lg font-bold text-white">
                Configuración del Bar
              </h3>
              <p className="text-xs text-slate-400">
                Parámetros maestros y personalización de tu despensa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar configuración"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Barra de Pestañas (Tabs) */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('categorias')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'categorias'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🏷️</span>
            <span>Categorías</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('respaldo')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'respaldo'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>💾</span>
            <span>Respaldo & Nube</span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded-full border border-slate-700">
              Pronto
            </span>
          </button>
        </div>

        {/* Contenido de la solapa activa */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'categorias' && <CategoriasConfig bebidas={bebidas} />}
          {activeTab === 'respaldo' && (
            <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-2">
              <span className="text-3xl">☁️</span>
              <p className="text-sm font-medium text-slate-300">
                Copia de Seguridad y Sincronización en la Nube
              </p>
              <p className="text-xs text-slate-500 max-w-sm">
                Esta sección permitirá exportar e importar tu inventario en formato JSON/CSV y
                sincronizar con Google Cloud en próximas versiones.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

