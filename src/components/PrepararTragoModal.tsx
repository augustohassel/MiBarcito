import React, { useState, useEffect } from 'react';
import { Receta } from '../domain/models/receta';
import { Bebida } from '../domain/models/bebida';
import { esBotellaCompatible } from '../domain/services/recetario-motor';

export interface PrepararTragoModalProps {
  isOpen: boolean;
  receta: Receta | null;
  bebidasEnDespensa: Bebida[];
  onClose: () => void;
  onConfirmarPreparacion: (
    receta: Receta,
    descuentos: { botellaId: string; cantidadMl: number }[]
  ) => Promise<{ ok: boolean; motivo?: string }>;
}

export const PrepararTragoModal: React.FC<PrepararTragoModalProps> = ({
  isOpen,
  receta,
  bebidasEnDespensa,
  onClose,
  onConfirmarPreparacion,
}) => {
  // Mapeo: nombreIngrediente -> botellaId seleccionada
  const [seleccionBotellas, setSeleccionBotellas] = useState<{ [ingredienteIdx: number]: string }>({});
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (!receta || !isOpen) {
      setSeleccionBotellas({});
      setErrorValidacion(null);
      setProcesando(false);
      return;
    }

    const initialSelection: { [ingredienteIdx: number]: string } = {};

    receta.ingredientes.forEach((ing, idx) => {
      if (ing.tipo === 'bebida') {
        const compatibles = bebidasEnDespensa.filter((b) => esBotellaCompatible(b, ing));
        // Elegir por defecto la botella con más stock
        compatibles.sort((a, b) => b.volumenRestanteMl - a.volumenRestanteMl);
        if (compatibles.length > 0) {
          initialSelection[idx] = compatibles[0].id;
        }
      }
    });

    setSeleccionBotellas(initialSelection);
    setErrorValidacion(null);
  }, [receta, bebidasEnDespensa, isOpen]);

  if (!isOpen || !receta) return null;

  const ingredientesBebida = receta.ingredientes
    .map((ing, idx) => ({ ing, idx }))
    .filter(({ ing }) => ing.tipo === 'bebida');

  // Evaluar en tiempo real si alguna botella seleccionada tiene stock insuficiente
  let hayStockInsuficiente = false;
  let mensajeStockInsuficiente: string | null = null;

  const itemsDescuento = ingredientesBebida.map(({ ing, idx }) => {
    const botellaId = seleccionBotellas[idx];
    const botella = bebidasEnDespensa.find((b) => b.id === botellaId);
    const cantidadRequerida = ing.cantidadMl ?? 0;
    const compatibles = bebidasEnDespensa.filter((b) => esBotellaCompatible(b, ing));

    const tieneStock = botella
      ? botella.volumenRestanteMl >= cantidadRequerida
      : Boolean(ing.opcional);

    if (!tieneStock) {
      hayStockInsuficiente = true;
      if (!mensajeStockInsuficiente) {
        if (!botella) {
          mensajeStockInsuficiente = `Falta seleccionar una botella para "${ing.nombre}" o no está en la despensa.`;
        } else {
          mensajeStockInsuficiente = `Stock insuficiente para ${botella.nombre} (${botella.marca}). Disponible: ${botella.volumenRestanteMl} ml, Requerido: ${cantidadRequerida} ml. No se permiten volúmenes negativos.`;
        }
      }
    }

    return {
      ing,
      idx,
      botella,
      compatibles,
      cantidadRequerida,
      tieneStock,
      proyeccionRestante: botella ? Math.max(0, botella.volumenRestanteMl - cantidadRequerida) : 0,
    };
  });

  const handleCambiarBotella = (ingIdx: number, nuevaBotellaId: string) => {
    setSeleccionBotellas((prev) => ({
      ...prev,
      [ingIdx]: nuevaBotellaId,
    }));
    setErrorValidacion(null);
  };

  const handleConfirmar = async () => {
    if (hayStockInsuficiente) {
      setErrorValidacion(mensajeStockInsuficiente);
      return;
    }

    const descuentos = itemsDescuento
      .filter((item) => Boolean(item.botella))
      .map((item) => ({
        botellaId: item.botella!.id,
        cantidadMl: item.cantidadRequerida,
      }));

    setProcesando(true);
    try {
      const resultado = await onConfirmarPreparacion(receta, descuentos);
      if (!resultado.ok) {
        setErrorValidacion(resultado.motivo || 'Ocurrió un error al descontar stock');
        setProcesando(false);
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorValidacion(err.message || 'Error inesperado al preparar el trago');
      setProcesando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-surface-container rounded-3xl border border-outline w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Encabezado */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🍸</span>
            <div>
              <h2 className="text-base font-semibold text-on-surface">
                Preparar: {receta.nombre}
              </h2>
              <p className="text-xs text-on-surface-variant">
                Confirmación y deducción segura de volumen en despensa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <p className="text-xs text-on-surface-variant">
            Se descontará el volumen requerido de las siguientes botellas de tu bar. Si tienes varias botellas de la misma bebida, puedes elegir cuál usar:
          </p>

          {/* Lista de botellas a descontar */}
          <div className="space-y-3">
            {itemsDescuento.map((item) => (
              <div
                key={item.idx}
                data-testid={`descuento-item-${item.idx}`}
                className={`p-3.5 rounded-2xl border transition-all ${
                  item.tieneStock
                    ? 'bg-surface border-outline-variant'
                    : 'bg-status-rose/10 border-status-rose/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.tieneStock ? 'bg-status-emerald' : 'bg-status-rose'
                      }`}
                    />
                    {item.ing.nombre}
                  </span>
                  <span className="text-xs font-bold text-primary">
                    -{item.cantidadRequerida} ml
                  </span>
                </div>

                {/* Selector de botella compatible */}
                {item.compatibles.length > 0 ? (
                  <div>
                    <label className="block text-[11px] text-on-surface-variant mb-1">
                      Botella a utilizar:
                    </label>
                    <select
                      value={item.botella?.id || ''}
                      onChange={(e) => handleCambiarBotella(item.idx, e.target.value)}
                      data-testid={`select-botella-${item.idx}`}
                      className="w-full px-3 py-1.5 rounded-xl bg-surface-container border border-outline text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {item.ing.opcional && (
                        <option value="">(Opcional - No incluir)</option>
                      )}
                      {item.compatibles.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.marca} - {b.nombre} (Stock: {b.volumenRestanteMl} ml)
                        </option>
                      ))}
                    </select>

                    {item.botella && (
                      <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-1.5 px-0.5">
                        <span>Stock actual: {item.botella.volumenRestanteMl} ml</span>
                        <span className={item.tieneStock ? 'text-status-emerald' : 'text-status-rose font-medium'}>
                          Quedará en: {item.proyeccionRestante} ml
                        </span>
                      </div>
                    )}
                  </div>
                ) : item.ing.opcional ? (
                  <p className="text-xs text-on-surface-variant italic">
                    Ingrediente opcional — No tenés botella compatible en tu despensa (no se descontará stock).
                  </p>
                ) : (
                  <p className="text-xs text-status-rose font-medium">
                    ⚠️ No se encontró ninguna botella compatible en tu despensa para este ingrediente.
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Alerta de Stock Insuficiente / Error */}
          {(hayStockInsuficiente || errorValidacion) && (
            <div
              data-testid="alerta-stock-insuficiente"
              className="p-3.5 rounded-2xl bg-status-rose/10 border border-status-rose/30 flex items-start gap-2.5 text-xs text-status-rose"
            >
              <span className="text-base leading-none">⚠️</span>
              <div>
                <strong className="font-semibold block mb-0.5">Acción bloqueada: Stock insuficiente</strong>
                <p>{errorValidacion || mensajeStockInsuficiente}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant flex items-center justify-end gap-3 bg-surface-container">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={hayStockInsuficiente || procesando}
            data-testid="btn-confirmar-preparacion"
            className={`px-5 py-2 rounded-xl text-xs font-medium transition-all shadow-xs ${
              hayStockInsuficiente || procesando
                ? 'bg-outline text-on-surface-variant cursor-not-allowed opacity-50'
                : 'bg-primary hover:bg-primary-hover text-on-primary'
            }`}
          >
            {procesando ? 'Preparando...' : 'Confirmar y Descontar Stock'}
          </button>
        </div>
      </div>
    </div>
  );
};

