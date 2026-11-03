import React, { useEffect } from 'react';

export interface ConfirmModalProps {
  isOpen: boolean;
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  variante?: 'peligro' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'peligro',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-md bg-surface-container border border-outline rounded-2xl shadow-xl p-6 text-on-surface flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          {variante === 'peligro' ? (
            <div className="w-10 h-10 rounded-xl bg-status-rose/15 border border-status-rose/30 text-status-rose flex items-center justify-center font-bold text-lg">
              ⚠️
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-primary-container border border-outline text-primary flex items-center justify-center font-bold text-lg">
              ℹ️
            </div>
          )}
          <h3 id="confirm-modal-title" className="text-lg font-semibold text-on-surface">
            {titulo}
          </h3>
        </div>

        <p className="text-sm text-on-surface-variant leading-relaxed">
          {mensaje}
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-on-surface bg-surface-container-high hover:bg-surface border border-outline rounded-xl transition-colors cursor-pointer"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-xs ${
              variante === 'peligro'
                ? 'bg-status-rose hover:bg-status-rose/90 text-white'
                : 'bg-primary hover:bg-primary-hover text-on-primary'
            }`}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
};
