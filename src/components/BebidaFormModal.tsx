import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCategoriasOpcional } from '../context/InventoryContext';
import {
  Bebida,
  CategoriaBebida,
  CATEGORIAS_BEBIDA,
  ErroresValidacionBebida,
  validarBebida,
  calcularPorcentajeRestante,
  estaEnAlertaStockBajo,
} from '../domain/models/bebida';
import { CATEGORIAS_PREDETERMINADAS } from '../domain/models/categoria';
import { compressAndResizeImage } from '../utils/image-processor';
import { analizarFotoBotella } from '../domain/services/gemini-botella.service';
import { hasGeminiApiKey } from '../infrastructure/ai/ai-config';

export interface BebidaFormValues {
  id?: string;
  nombre: string;
  marca: string;
  categoria: CategoriaBebida;
  subcategoria?: string;
  volumenTotalMl: number;
  volumenRestanteMl: number;
  graduacionAlcoholica?: number;
  precioEstimado?: number;
  stockMinimoMl?: number;
  esFavorito: boolean;
  notas?: string;
  archivada?: boolean;
  recomprar?: boolean;
}

export interface BebidaFormModalProps {
  isOpen: boolean;
  bebidaAEditar?: Bebida | null;
  modoInicialLectura?: boolean;
  onSave: (datos: BebidaFormValues) => Promise<void> | void;
  onClose: () => void;
  fotoInicial?: File | null;
  onAbrirConfiguracionIa?: () => void;
}

const VALORES_INICIALES: BebidaFormValues = {
  nombre: '',
  marca: '',
  categoria: 'destilado',
  subcategoria: '',
  volumenTotalMl: 750,
  volumenRestanteMl: 750,
  graduacionAlcoholica: undefined,
  precioEstimado: undefined,
  stockMinimoMl: 150,
  esFavorito: false,
  notas: '',
  archivada: false,
  recomprar: undefined,
};

export const BebidaFormModal: React.FC<BebidaFormModalProps> = ({
  isOpen,
  bebidaAEditar,
  modoInicialLectura = false,
  onSave,
  onClose,
  fotoInicial,
  onAbrirConfiguracionIa,
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
  const [isModoLectura, setIsModoLectura] = useState(() =>
    Boolean(modoInicialLectura && bebidaAEditar)
  );

  useEffect(() => {
    if (isOpen) {
      setIsModoLectura(Boolean(modoInicialLectura && bebidaAEditar));
    }
  }, [isOpen, modoInicialLectura, bebidaAEditar]);

  // Subcategorías disponibles según la categoría seleccionada
  const subcategoriasDisponibles = useMemo(() => {
    const cat = categoriasCtx?.categorias.find((c) => c.id === formData.categoria);
    return (
      cat?.subcategorias ??
      CATEGORIAS_PREDETERMINADAS.find((c) => c.id === formData.categoria)?.subcategorias ??
      []
    );
  }, [categoriasCtx?.categorias, formData.categoria]);

  // Estados de IA y Carga por Foto
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const procesarArchivoImagen = async (file: File) => {
    setAiError(null);
    setAiSuccessMessage(null);

    try {
      const processed = await compressAndResizeImage(file);
      setFotoPreview(processed.dataUrl);

      if (!hasGeminiApiKey()) {
        setAiError(
          'Para el reconocimiento automático con IA, es necesario configurar una Gemini API Key.'
        );
        return;
      }

      setIsAnalyzingPhoto(true);

      const nombresCategorias = opcionesCategorias.map((c) => c.label);
      const resultado = await analizarFotoBotella(
        {
          base64Data: processed.base64Data,
          mimeType: processed.mimeType,
        },
        { categoriasDisponibles: nombresCategorias }
      );

      if (!resultado.exito || !resultado.datos) {
        setAiError(
          resultado.error ||
            'No pudimos reconocer la etiqueta con claridad. Podés completar los campos manualmente con la foto de referencia.'
        );
        return;
      }

      const datos = resultado.datos;

      // Mapear categoría sugerida a una opción válida del bar
      let categoriaMapeada = formData.categoria;
      if (datos.categoriaSugerida) {
        const sugeridaLower = datos.categoriaSugerida.toLowerCase();
        const encontrada = opcionesCategorias.find(
          (c) =>
            c.label.toLowerCase() === sugeridaLower ||
            c.value.toLowerCase() === sugeridaLower ||
            c.label.toLowerCase().includes(sugeridaLower) ||
            sugeridaLower.includes(c.label.toLowerCase())
        );
        if (encontrada) {
          categoriaMapeada = encontrada.value as CategoriaBebida;
        }
      }

      setFormData((prev) => ({
        ...prev,
        nombre: datos.nombre || prev.nombre,
        marca: datos.marca || prev.marca,
        categoria: categoriaMapeada,
        graduacionAlcoholica:
          datos.graduacionAlcoholica !== undefined
            ? datos.graduacionAlcoholica
            : prev.graduacionAlcoholica,
        precioEstimado:
          datos.precioEstimado !== undefined ? datos.precioEstimado : prev.precioEstimado,
        volumenTotalMl: datos.volumenTotalMl || prev.volumenTotalMl || 750,
        volumenRestanteMl: datos.volumenTotalMl || prev.volumenRestanteMl || 750,
      }));

      const notaGrounding = resultado.fuentePrecios
        ? ` (precio de mercado sugerido vía ${resultado.fuentePrecios})`
        : '';
      setAiSuccessMessage(
        `¡Botella reconocida con éxito!${notaGrounding} Revisá los datos antes de guardar.`
      );
    } catch (err) {
      console.error('Error al procesar la fotografía:', err);
      setAiError(
        'Ocurrió un inconveniente al procesar la foto. Podés completar los datos manualmente con la imagen como guía.'
      );
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  useEffect(() => {
    if (bebidaAEditar) {
      const cat = categoriasCtx?.categorias.find((c) => c.id === bebidaAEditar.categoria);
      const subcatsValidas =
        cat?.subcategorias ??
        CATEGORIAS_PREDETERMINADAS.find((c) => c.id === bebidaAEditar.categoria)?.subcategorias ??
        [];
      const subcategoriaValida =
        bebidaAEditar.subcategoria && subcatsValidas.includes(bebidaAEditar.subcategoria)
          ? bebidaAEditar.subcategoria
          : '';

      setFormData({
        id: bebidaAEditar.id,
        nombre: bebidaAEditar.nombre,
        marca: bebidaAEditar.marca,
        categoria: bebidaAEditar.categoria,
        subcategoria: subcategoriaValida,
        volumenTotalMl: bebidaAEditar.volumenTotalMl,
        volumenRestanteMl: bebidaAEditar.volumenRestanteMl,
        graduacionAlcoholica: bebidaAEditar.graduacionAlcoholica,
        precioEstimado: bebidaAEditar.precioEstimado,
        stockMinimoMl: bebidaAEditar.stockMinimoMl,
        esFavorito: bebidaAEditar.esFavorito ?? false,
        notas: bebidaAEditar.notas ?? '',
        archivada: bebidaAEditar.archivada ?? false,
        recomprar: bebidaAEditar.recomprar,
      });
      setFotoPreview(null);
      setAiError(null);
      setAiSuccessMessage(null);
    } else {
      setFormData({
        ...VALORES_INICIALES,
        categoria: opcionesCategorias[0]?.value || 'destilado',
        subcategoria: '',
      });
      setFotoPreview(null);
      setAiError(null);
      setAiSuccessMessage(null);

      if (fotoInicial && isOpen) {
        procesarArchivoImagen(fotoInicial);
      }
    }
    setErrores({});
  }, [bebidaAEditar, isOpen, fotoInicial]);

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

  const handleCategoriaChange = (nuevaCategoria: CategoriaBebida) => {
    // Al cambiar la categoría principal, se resetea la subcategoría para evitar combinaciones incoherentes
    const updated: BebidaFormValues = {
      ...formData,
      categoria: nuevaCategoria,
      subcategoria: '',
    };
    setFormData(updated);

    if (errores.categoria || errores.subcategoria) {
      const nuevosErrores = validarBebida(
        updated,
        opcionesCategorias.map((c) => c.value)
      );
      setErrores((prevErr) => ({
        ...prevErr,
        categoria: nuevosErrores.categoria,
        subcategoria: nuevosErrores.subcategoria,
      }));
    }
  };

  const handleLlenar100 = () => {
    handleChange('volumenRestanteMl', formData.volumenTotalMl);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      procesarArchivoImagen(files[0]);
    }
    // Resetear valor para permitir seleccionar la misma imagen nuevamente
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const datosParaGuardar: BebidaFormValues = {
      ...formData,
      subcategoria: formData.subcategoria?.trim() ? formData.subcategoria.trim() : undefined,
      notas: formData.notas?.trim() ? formData.notas.trim() : undefined,
      archivada: formData.archivada ? true : undefined,
      recomprar: formData.recomprar,
    };
    const resultadoErrores = validarBebida(
      datosParaGuardar,
      opcionesCategorias.map((c) => c.value)
    );

    if (Object.keys(resultadoErrores).length > 0) {
      setErrores(resultadoErrores);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(datosParaGuardar);
      onClose();
    } catch (err) {
      console.error('Error al guardar bebida:', err);
      setErrores({ general: 'Ocurrió un error al guardar la bebida' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const esEdicion = Boolean(bebidaAEditar);

  // Datos calculados para la Ficha Técnica (modo lectura)
  const categoriaFicha = categoriasCtx?.categorias.find(
    (c) => c.id === (bebidaAEditar?.categoria || formData.categoria)
  );
  const categoriaFichaLabel =
    categoriaFicha?.nombre ||
    CATEGORIAS_BEBIDA.find(
      (c) => c.value === (bebidaAEditar?.categoria || formData.categoria)
    )?.label ||
    bebidaAEditar?.categoria ||
    formData.categoria;

  const subcatsValidasFicha =
    categoriaFicha?.subcategorias ??
    CATEGORIAS_PREDETERMINADAS.find((c) => c.id === bebidaAEditar?.categoria)?.subcategorias ??
    [];
  const subcategoriaFichaValida =
    bebidaAEditar?.subcategoria && subcatsValidasFicha.includes(bebidaAEditar.subcategoria)
      ? bebidaAEditar.subcategoria
      : null;

  const porcentajeFicha = bebidaAEditar ? calcularPorcentajeRestante(bebidaAEditar) : 0;
  const bajoStockFicha = bebidaAEditar ? estaEnAlertaStockBajo(bebidaAEditar) : false;

  if (isModoLectura && bebidaAEditar) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ficha-tecnica-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      >
        <div
          className="w-full max-w-lg bg-surface-container border border-outline rounded-2xl shadow-xl p-6 text-on-surface my-8 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabecera del Modal de Ficha Técnica */}
          <div className="flex items-center justify-between border-b border-outline pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <div className="flex items-center gap-2">
                <h2 id="ficha-tecnica-title" className="text-lg font-bold text-on-surface">
                  Ficha Técnica
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant border border-outline">
                  Modo Lectura
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              ✕
            </button>
          </div>

          {/* Cuerpo de la Ficha Técnica */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-surface border border-outline flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-container-high text-primary border border-outline">
                    {categoriaFichaLabel}
                  </span>
                  {subcategoriaFichaValida && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-surface-container-high text-secondary border border-outline">
                      {subcategoriaFichaValida}
                    </span>
                  )}
                  {bajoStockFicha && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-status-amber/20 text-status-amber border border-status-amber/30 flex items-center gap-1">
                      ⚠️ Stock Bajo
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-on-surface truncate" title={bebidaAEditar.nombre}>
                  {bebidaAEditar.nombre}
                </h3>
                <p className="text-sm text-on-surface-variant truncate" title={bebidaAEditar.marca}>
                  {bebidaAEditar.marca}
                </p>
              </div>
              {bebidaAEditar.esFavorito && (
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-status-amber/15 text-status-amber border border-status-amber/30 flex items-center gap-1 shrink-0"
                  title="Bebida favorita"
                >
                  ★ Favorito
                </span>
              )}
            </div>

            {/* Nivel de Botella */}
            <div className="p-4 rounded-xl bg-surface border border-outline space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface-variant font-medium">Nivel de Botella</span>
                <span className="font-bold text-on-surface">
                  {bebidaAEditar.volumenRestanteMl} / {bebidaAEditar.volumenTotalMl} ml ({porcentajeFicha}%)
                </span>
              </div>
              <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden border border-outline">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    bajoStockFicha
                      ? 'bg-gradient-to-r from-status-amber to-status-rose'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${porcentajeFicha}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-1">
                <span>Umbral de alerta mínima de reposición:</span>
                <span className="font-semibold text-on-surface">
                  {bebidaAEditar.stockMinimoMl ?? 150} ml
                </span>
              </div>
            </div>

            {/* Grilla de Atributos */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-surface border border-outline">
                <span className="text-[11px] text-on-surface-variant block uppercase font-medium tracking-wider">
                  Graduación Alcohólica
                </span>
                <span className="text-sm sm:text-base font-bold text-on-surface mt-1 block">
                  {bebidaAEditar.graduacionAlcoholica !== undefined
                    ? `${bebidaAEditar.graduacionAlcoholica}% ABV`
                    : 'No especificada'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-outline">
                <span className="text-[11px] text-on-surface-variant block uppercase font-medium tracking-wider">
                  Precio Estimado
                </span>
                <span className="text-sm sm:text-base font-bold text-on-surface mt-1 block">
                  {bebidaAEditar.precioEstimado !== undefined
                    ? `$${bebidaAEditar.precioEstimado.toLocaleString('es-AR')}`
                    : 'Sin cotizar'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-outline">
                <span className="text-[11px] text-on-surface-variant block uppercase font-medium tracking-wider">
                  Categoría Maestra
                </span>
                <span className="text-sm font-semibold text-on-surface mt-1 block truncate">
                  {categoriaFichaLabel}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-outline">
                <span className="text-[11px] text-on-surface-variant block uppercase font-medium tracking-wider">
                  Subcategoría
                </span>
                <span className="text-sm font-semibold text-on-surface mt-1 block truncate">
                  {subcategoriaFichaValida || 'Sin subcategoría'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-outline">
                <span className="text-[11px] text-on-surface-variant block uppercase font-medium tracking-wider">
                  ¿Volverías a comprar?
                </span>
                <span className="text-sm font-semibold text-on-surface mt-1 block truncate">
                  {bebidaAEditar.recomprar === true
                    ? '✅ Sí, volvería a comprar'
                    : bebidaAEditar.recomprar === false
                    ? '❌ No volver a comprar'
                    : 'Sin definir'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-outline">
                <span className="text-[11px] text-on-surface-variant block uppercase font-medium tracking-wider">
                  Estado
                </span>
                <span className="text-sm font-semibold text-on-surface mt-1 block truncate">
                  {bebidaAEditar.archivada ? '📦 Archivada en historial' : '🟢 Activa en despensa'}
                </span>
              </div>
            </div>

            {/* Notas de cata en Ficha Técnica */}
            {bebidaAEditar.notas && (
              <div className="p-3.5 rounded-xl bg-surface border border-outline">
                <span className="text-[11px] text-on-surface-variant block uppercase font-medium tracking-wider mb-1">
                  Notas de Cata / Descripción
                </span>
                <p className="text-xs text-on-surface italic leading-relaxed whitespace-pre-wrap">
                  "{bebidaAEditar.notas}"
                </p>
              </div>
            )}

            {/* Fechas de Auditoría */}
            {(bebidaAEditar.fechaCreacion || bebidaAEditar.fechaActualizacion) && (
              <div className="text-[11px] text-on-surface-variant text-right px-1 pt-1 opacity-80">
                Última actualización:{' '}
                {new Date(
                  bebidaAEditar.fechaActualizacion || bebidaAEditar.fechaCreacion || ''
                ).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            )}
          </div>

          {/* Footer de Ficha Técnica */}
          <div className="flex items-center justify-between border-t border-outline pt-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-on-surface bg-surface-container-high hover:bg-surface border border-outline rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => setIsModoLectura(false)}
              className="px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span>✏️</span>
              <span>Editar Bebida</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bebida-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-lg bg-surface-container border border-outline rounded-2xl shadow-xl p-6 text-on-surface my-8 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-outline pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍾</span>
            <h2 id="bebida-form-title" className="text-lg font-bold text-on-surface">
              {esEdicion ? 'Editar Bebida' : 'Agregar Nueva Bebida'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {modoInicialLectura && esEdicion && (
              <button
                type="button"
                onClick={() => setIsModoLectura(true)}
                className="text-xs font-medium text-on-surface-variant hover:text-on-surface px-2.5 py-1 rounded-lg border border-outline hover:bg-surface-container-high transition-colors cursor-pointer flex items-center gap-1"
                title="Volver a la ficha técnica en modo lectura"
              >
                <span>←</span>
                <span>Ficha</span>
              </button>
            )}
            {!esEdicion && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileInputChange}
                  aria-label="Cargar foto de botella"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzingPhoto}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary/25 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title="Capturar o subir foto para autocompletar con Gemini IA"
                >
                  <span>📸</span>
                  <span>{fotoPreview ? 'Cambiar Foto' : 'Autocompletar con Foto'}</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Panel de Foto y Estado de Reconocimiento IA */}
        {fotoPreview && (
          <div className="flex items-start gap-3 p-3 bg-surface rounded-xl border border-outline animate-in fade-in duration-150">
            <div className="relative shrink-0">
              <img
                src={fotoPreview}
                alt="Foto de la botella tomada"
                className="w-16 h-20 object-cover rounded-lg border border-outline shadow-xs bg-surface-container-high"
              />
              <button
                type="button"
                onClick={() => {
                  setFotoPreview(null);
                  setAiError(null);
                  setAiSuccessMessage(null);
                }}
                className="absolute -top-1.5 -right-1.5 bg-surface-container-high text-on-surface-variant hover:text-error rounded-full p-0.5 border border-outline text-[10px] w-4 h-4 flex items-center justify-center cursor-pointer"
                title="Quitar foto de referencia"
                aria-label="Quitar foto de referencia"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-on-surface flex items-center gap-1">
                  <span>📸</span> Foto de Referencia
                </span>
                {isAnalyzingPhoto && (
                  <span className="text-[11px] text-primary animate-pulse font-medium">
                    Analizando con Gemini...
                  </span>
                )}
              </div>

              {isAnalyzingPhoto && (
                <div className="flex items-center gap-2 text-on-surface-variant text-[11px] py-1">
                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Extrayendo marca, graduación y buscando precios de mercado...</span>
                </div>
              )}

              {aiSuccessMessage && !isAnalyzingPhoto && (
                <div className="p-2 rounded-lg bg-secondary/10 border border-secondary/30 text-secondary text-[11px] font-medium flex items-start gap-1.5">
                  <span>✨</span>
                  <span>{aiSuccessMessage}</span>
                </div>
              )}

              {aiError && !isAnalyzingPhoto && (
                <div className="p-2 rounded-lg bg-status-rose/10 border border-status-rose/30 text-status-rose text-[11px] font-medium flex flex-col gap-1">
                  <div className="flex items-start gap-1">
                    <span>⚠️</span>
                    <span>{aiError}</span>
                  </div>
                  {aiError.includes('Gemini API Key') && onAbrirConfiguracionIa && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onAbrirConfiguracionIa();
                      }}
                      className="text-primary hover:underline text-left font-semibold text-[11px] mt-0.5 cursor-pointer"
                    >
                      Configurar API Key ahora ↗
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {errores.general && (
          <div className="p-3 rounded-xl bg-status-rose/10 border border-status-rose/30 text-status-rose text-xs">
            {errores.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Nombre y Marca */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nombre" className="block text-xs font-medium text-on-surface-variant mb-1">
                Nombre de la Bebida *
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                placeholder="Ej. London Dry, Black Label"
                value={formData.nombre}
                onChange={(e) => handleChange('nombre', e.target.value)}
                className={`w-full px-3 py-2 bg-surface border rounded-xl text-sm text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                  errores.nombre ? 'border-status-rose ring-1 ring-status-rose' : 'border-outline'
                }`}
              />
              {errores.nombre && (
                <p className="text-status-rose text-xs mt-1">{errores.nombre}</p>
              )}
            </div>

            <div>
              <label htmlFor="marca" className="block text-xs font-medium text-on-surface-variant mb-1">
                Marca / Destilería *
              </label>
              <input
                id="marca"
                name="marca"
                type="text"
                placeholder="Ej. Bombay, Johnnie Walker"
                value={formData.marca}
                onChange={(e) => handleChange('marca', e.target.value)}
                className={`w-full px-3 py-2 bg-surface border rounded-xl text-sm text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                  errores.marca ? 'border-status-rose ring-1 ring-status-rose' : 'border-outline'
                }`}
              />
              {errores.marca && (
                <p className="text-status-rose text-xs mt-1">{errores.marca}</p>
              )}
            </div>
          </div>

          {/* Categoría y Subcategoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="categoria" className="block text-xs font-medium text-on-surface-variant mb-1">
                Categoría *
              </label>
              <select
                id="categoria"
                name="categoria"
                value={formData.categoria}
                onChange={(e) => handleCategoriaChange(e.target.value as CategoriaBebida)}
                className={`w-full px-3 py-2 bg-surface border rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                  errores.categoria ? 'border-status-rose ring-1 ring-status-rose' : 'border-outline'
                }`}
              >
                {opcionesCategorias.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {errores.categoria && (
                <p className="text-status-rose text-xs mt-1">{errores.categoria}</p>
              )}
            </div>

            <div>
              <label htmlFor="subcategoria" className="block text-xs font-medium text-on-surface-variant mb-1">
                Subcategoría (Opcional)
              </label>
              <select
                id="subcategoria"
                name="subcategoria"
                value={formData.subcategoria || ''}
                onChange={(e) => handleChange('subcategoria', e.target.value || undefined)}
                disabled={subcategoriasDisponibles.length === 0}
                className="w-full px-3 py-2 bg-surface border border-outline rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Sin subcategoría</option>
                {subcategoriasDisponibles.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
              {errores.subcategoria && (
                <p className="text-status-rose text-xs mt-1">{errores.subcategoria}</p>
              )}
            </div>
          </div>

          {/* Favorito */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.esFavorito}
                onChange={(e) => handleChange('esFavorito', e.target.checked)}
                className="w-4 h-4 rounded text-primary bg-surface border-outline focus:ring-primary"
              />
              <span>⭐ Marcar como Favorito</span>
            </label>
          </div>

          {/* Volúmenes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-surface border border-outline">
            <div>
              <label htmlFor="volumenTotalMl" className="block text-xs font-medium text-on-surface-variant mb-1">
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
                className={`w-full px-3 py-2 bg-surface-container border rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                  errores.volumenTotalMl ? 'border-status-rose ring-1 ring-status-rose' : 'border-outline'
                }`}
              />
              {errores.volumenTotalMl && (
                <p className="text-status-rose text-xs mt-1">{errores.volumenTotalMl}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="volumenRestanteMl" className="block text-xs font-medium text-on-surface-variant">
                  Volumen Restante (ml) *
                </label>
                <button
                  type="button"
                  onClick={handleLlenar100}
                  className="text-[11px] text-primary hover:underline cursor-pointer"
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
                className={`w-full px-3 py-2 bg-surface-container border rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                  errores.volumenRestanteMl ? 'border-status-rose ring-1 ring-status-rose' : 'border-outline'
                }`}
              />
              {errores.volumenRestanteMl && (
                <p className="text-status-rose text-xs mt-1">{errores.volumenRestanteMl}</p>
              )}
            </div>
          </div>

          {/* Graduación, Precio, Stock Mínimo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="graduacionAlcoholica" className="block text-xs font-medium text-on-surface-variant mb-1">
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
                className={`w-full px-3 py-2 bg-surface border rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                  errores.graduacionAlcoholica ? 'border-status-rose ring-1 ring-status-rose' : 'border-outline'
                }`}
              />
              {errores.graduacionAlcoholica && (
                <p className="text-status-rose text-xs mt-1">{errores.graduacionAlcoholica}</p>
              )}
            </div>

            <div>
              <label htmlFor="precioEstimado" className="block text-xs font-medium text-on-surface-variant mb-1">
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
                className={`w-full px-3 py-2 bg-surface border rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                  errores.precioEstimado ? 'border-status-rose ring-1 ring-status-rose' : 'border-outline'
                }`}
              />
              {errores.precioEstimado && (
                <p className="text-status-rose text-xs mt-1">{errores.precioEstimado}</p>
              )}
            </div>

            <div>
              <label htmlFor="stockMinimoMl" className="block text-xs font-medium text-on-surface-variant mb-1">
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
                className={`w-full px-3 py-2 bg-surface border rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                  errores.stockMinimoMl ? 'border-status-rose ring-1 ring-status-rose' : 'border-outline'
                }`}
              />
              {errores.stockMinimoMl && (
                <p className="text-status-rose text-xs mt-1">{errores.stockMinimoMl}</p>
              )}
            </div>
          </div>

          {/* Notas de cata / Descripción (máx. 500 caracteres) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="notas" className="block text-xs font-medium text-on-surface-variant">
                Notas de cata / Descripción (opcional)
              </label>
              <span className="text-[10px] text-on-surface-variant">
                {(formData.notas || '').length} / 500
              </span>
            </div>
            <textarea
              id="notas"
              name="notas"
              rows={2}
              maxLength={500}
              placeholder="Ej. Notas cítricas y enebro marcado. Ideal para Gin Tonic con piel de pomelo."
              value={formData.notas ?? ''}
              onChange={(e) => handleChange('notas', e.target.value)}
              className={`w-full px-3 py-2 bg-surface border rounded-xl text-sm text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary transition-colors resize-none ${
                errores.notas ? 'border-status-rose ring-1 ring-status-rose' : 'border-outline'
              }`}
            />
            {errores.notas && (
              <p className="text-status-rose text-xs mt-1">{errores.notas}</p>
            )}
          </div>

          {/* Decisión de Recompra y Archivado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Selector de Recompra */}
            <div>
              <label htmlFor="recomprar" className="block text-xs font-medium text-on-surface-variant mb-1">
                ¿Volverías a comprar?
              </label>
              <select
                id="recomprar"
                name="recomprar"
                value={
                  formData.recomprar === true
                    ? 'si'
                    : formData.recomprar === false
                    ? 'no'
                    : 'sin_definir'
                }
                onChange={(e) => {
                  const val = e.target.value;
                  handleChange(
                    'recomprar',
                    val === 'si' ? true : val === 'no' ? false : undefined
                  );
                }}
                className="w-full px-3 py-2 bg-surface border border-outline rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-colors cursor-pointer"
              >
                <option value="sin_definir">Sin definir (No suma a reposición)</option>
                <option value="si">✅ Sí, volvería a comprar (Incluir en reposición)</option>
                <option value="no">❌ No volver a comprar</option>
              </select>
            </div>

            {/* Checkbox de Archivado */}
            <div className="flex items-center">
              <label className="flex items-center gap-2.5 p-2 rounded-xl bg-surface border border-outline cursor-pointer w-full hover:bg-surface-container-high transition-colors">
                <input
                  type="checkbox"
                  id="archivada"
                  name="archivada"
                  checked={formData.archivada ?? false}
                  onChange={(e) => handleChange('archivada', e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-outline cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-on-surface block">
                    Archivar botella 📦
                  </span>
                  <span className="text-[10px] text-on-surface-variant block">
                    Excluir de despensa activa, recetario y valor total
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-on-surface bg-surface-container-high hover:bg-surface border border-outline rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isAnalyzingPhoto}
              className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-primary hover:bg-primary-hover text-on-primary shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Crear Bebida'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
