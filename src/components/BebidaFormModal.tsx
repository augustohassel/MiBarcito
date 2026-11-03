import React, { useEffect, useMemo, useState } from 'react';
import { useCategoriasOpcional } from '../context/InventoryContext';
import {
  Bebida,
  CategoriaBebida,
  CATEGORIAS_BEBIDA,
  ErroresValidacionBebida,
  validarBebida,
} from '../domain/models/bebida';

export interface BebidaFormValues {
  id?: string;
  nombre: string;
  marca: string;
  categoria: CategoriaBebida;
  volumenTotalMl: number;
  volumenRestanteMl: number;
  graduacionAlcoholica?: number;
  precioEstimado?: number;
  stockMinimoMl?: number;
  esFavorito: boolean;
}

export interface BebidaFormModalProps {
  isOpen: boolean;
  bebidaAEditar?: Bebida | null;
  onSave: (datos: BebidaFormValues) => Promise<void> | void;
  onClose: () => void;
}

const VALORES_INICIALES: BebidaFormValues = {
  nombre: '',
  marca: '',
  categoria: 'destilado',
  volumenTotalMl: 750,
  volumenRestanteMl: 750,
  graduacionAlcoholica: undefined,
  precioEstimado: undefined,
  stockMinimoMl: 150,
  esFavorito: false,
};

export const BebidaFormModal: React.FC<BebidaFormModalProps> = ({
  isOpen,
  bebidaAEditar,
  onSave,
  onClose,
}) => {
  const categoriasCtx = useCategoriasOpcional();
  const opcionesCategorias = useMemo(() => {
    return categoriasCtx && categoriasCtx.categorias.length > 0
      ? categoriasCtx.categorias.map((c) => ({ value: c.id, label: c.nombre }))
      : CATEGORIAS_BEBIDA;
  }, [categoriasCtx?.categorias]);

  const [formData, setFormData] = useState<BebidaFormValues>(VALORES_INICIALES);
  const [errores, setErrores] = useState<ErroresValidacionBebida>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (bebidaAEditar) {
      setFormData({
        id: bebidaAEditar.id,
        nombre: bebidaAEditar.nombre,
        marca: bebidaAEditar.marca,
        categoria: bebidaAEditar.categoria,
        volumenTotalMl: bebidaAEditar.volumenTotalMl,
        volumenRestanteMl: bebidaAEditar.volumenRestanteMl,
        graduacionAlcoholica: bebidaAEditar.graduacionAlcoholica,
        precioEstimado: bebidaAEditar.precioEstimado,
        stockMinimoMl: bebidaAEditar.stockMinimoMl,
        esFavorito: bebidaAEditar.esFavorito ?? false,
      });
    } else {
      setFormData({
        ...VALORES_INICIALES,
        categoria: opcionesCategorias[0]?.value || 'destilado',
      });
    }
    setErrores({});
  }, [bebidaAEditar, isOpen]);

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

  const handleChange = (
    campo: keyof BebidaFormValues,
    valor: string | number | boolean | undefined
  ) => {
    const updated: BebidaFormValues = { ...formData, [campo]: valor };
    setFormData(updated);

    // Limpiar error del campo modificado si ya no aplica
    if (errores[campo as keyof ErroresValidacionBebida]) {
      const nuevosErrores = validarBebida(
        updated,
        opcionesCategorias.map((c) => c.value)
      );
      setErrores((prevErr) => ({
        ...prevErr,
        [campo]: nuevosErrores[campo as keyof ErroresValidacionBebida],
      }));
    }
  };

  const handleLlenar100 = () => {
    handleChange('volumenRestanteMl', formData.volumenTotalMl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resultadoErrores = validarBebida(
      formData,
      opcionesCategorias.map((c) => c.value)
    );

    if (Object.keys(resultadoErrores).length > 0) {
      setErrores(resultadoErrores);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Error al guardar bebida:', err);
      setErrores({ general: 'Ocurrió un error al guardar la bebida' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const esEdicion = Boolean(bebidaAEditar);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bebida-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 my-8 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍾</span>
            <h2 id="bebida-form-title" className="text-lg font-bold text-white">
              {esEdicion ? 'Editar Bebida' : 'Agregar Nueva Bebida'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {errores.general && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {errores.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Nombre y Marca */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nombre" className="block text-xs font-medium text-slate-300 mb-1">
                Nombre de la Bebida *
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                placeholder="Ej. London Dry, Black Label"
                value={formData.nombre}
                onChange={(e) => handleChange('nombre', e.target.value)}
                className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors ${
                  errores.nombre ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-800'
                }`}
              />
              {errores.nombre && (
                <p className="text-rose-400 text-xs mt-1">{errores.nombre}</p>
              )}
            </div>

            <div>
              <label htmlFor="marca" className="block text-xs font-medium text-slate-300 mb-1">
                Marca / Destilería *
              </label>
              <input
                id="marca"
                name="marca"
                type="text"
                placeholder="Ej. Bombay, Johnnie Walker"
                value={formData.marca}
                onChange={(e) => handleChange('marca', e.target.value)}
                className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors ${
                  errores.marca ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-800'
                }`}
              />
              {errores.marca && (
                <p className="text-rose-400 text-xs mt-1">{errores.marca}</p>
              )}
            </div>
          </div>

          {/* Categoría y Favorito */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label htmlFor="categoria" className="block text-xs font-medium text-slate-300 mb-1">
                Categoría *
              </label>
              <select
                id="categoria"
                name="categoria"
                value={formData.categoria}
                onChange={(e) => handleChange('categoria', e.target.value as CategoriaBebida)}
                className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors ${
                  errores.categoria ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-800'
                }`}
              >
                {opcionesCategorias.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {errores.categoria && (
                <p className="text-rose-400 text-xs mt-1">{errores.categoria}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-5">
              <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.esFavorito}
                  onChange={(e) => handleChange('esFavorito', e.target.checked)}
                  className="w-4 h-4 rounded text-sky-500 bg-slate-950 border-slate-800 focus:ring-sky-500 focus:ring-offset-slate-900"
                />
                <span>⭐ Marcar como Favorito</span>
              </label>
            </div>
          </div>

          {/* Volúmenes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <div>
              <label htmlFor="volumenTotalMl" className="block text-xs font-medium text-slate-300 mb-1">
                Capacidad Total (ml) *
              </label>
              <input
                id="volumenTotalMl"
                name="volumenTotalMl"
                type="number"
                min="1"
                step="25"
                placeholder="750"
                value={formData.volumenTotalMl || ''}
                onChange={(e) => handleChange('volumenTotalMl', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors ${
                  errores.volumenTotalMl ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-800'
                }`}
              />
              {errores.volumenTotalMl && (
                <p className="text-rose-400 text-xs mt-1">{errores.volumenTotalMl}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="volumenRestanteMl" className="block text-xs font-medium text-slate-300">
                  Volumen Restante (ml) *
                </label>
                <button
                  type="button"
                  onClick={handleLlenar100}
                  className="text-[11px] text-sky-400 hover:text-sky-300 underline cursor-pointer"
                >
                  Lleno 100%
                </button>
              </div>
              <input
                id="volumenRestanteMl"
                name="volumenRestanteMl"
                type="number"
                min="0"
                step="25"
                placeholder="750"
                value={formData.volumenRestanteMl !== undefined ? formData.volumenRestanteMl : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  handleChange('volumenRestanteMl', val);
                }}
                className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors ${
                  errores.volumenRestanteMl ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-800'
                }`}
              />
              {errores.volumenRestanteMl && (
                <p className="text-rose-400 text-xs mt-1">{errores.volumenRestanteMl}</p>
              )}
            </div>
          </div>

          {/* Graduación, Precio, Stock Mínimo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="graduacionAlcoholica" className="block text-xs font-medium text-slate-300 mb-1">
                Graduación (% ABV)
              </label>
              <input
                id="graduacionAlcoholica"
                name="graduacionAlcoholica"
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="Ej. 40"
                value={formData.graduacionAlcoholica ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  handleChange('graduacionAlcoholica', val);
                }}
                className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors ${
                  errores.graduacionAlcoholica ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-800'
                }`}
              />
              {errores.graduacionAlcoholica && (
                <p className="text-rose-400 text-xs mt-1">{errores.graduacionAlcoholica}</p>
              )}
            </div>

            <div>
              <label htmlFor="precioEstimado" className="block text-xs font-medium text-slate-300 mb-1">
                Precio Est. ($)
              </label>
              <input
                id="precioEstimado"
                name="precioEstimado"
                type="number"
                min="0"
                step="100"
                placeholder="Ej. 18000"
                value={formData.precioEstimado ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  handleChange('precioEstimado', val);
                }}
                className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors ${
                  errores.precioEstimado ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-800'
                }`}
              />
              {errores.precioEstimado && (
                <p className="text-rose-400 text-xs mt-1">{errores.precioEstimado}</p>
              )}
            </div>

            <div>
              <label htmlFor="stockMinimoMl" className="block text-xs font-medium text-slate-300 mb-1">
                Alerta Bajo (ml)
              </label>
              <input
                id="stockMinimoMl"
                name="stockMinimoMl"
                type="number"
                min="0"
                step="50"
                placeholder="Ej. 200"
                value={formData.stockMinimoMl ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  handleChange('stockMinimoMl', val);
                }}
                className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors ${
                  errores.stockMinimoMl ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-800'
                }`}
              />
              {errores.stockMinimoMl && (
                <p className="text-rose-400 text-xs mt-1">{errores.stockMinimoMl}</p>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Crear Bebida'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

