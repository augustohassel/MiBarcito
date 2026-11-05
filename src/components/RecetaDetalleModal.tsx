import React from 'react';
import { Receta } from '../domain/models/receta';
import { EvaluacionReceta } from '../domain/services/recetario-motor';
import { CATEGORIAS_PREDETERMINADAS } from '../domain/models/categoria';
import { useCategoriasOpcional } from '../context/InventoryContext';

export interface RecetaDetalleModalProps {
  isOpen: boolean;
  receta: Receta | null;
  evaluacion?: EvaluacionReceta | null;
  onClose: () => void;
  onPreparar: (receta: Receta) => void;
  onToggleFavorito: (id: string) => void;
  onEditar?: (receta: Receta) => void;
  onDuplicar?: (receta: Receta) => void;
}

export const RecetaDetalleModal: React.FC<RecetaDetalleModalProps> = ({
  isOpen,
  receta,
  evaluacion,
  onClose,
  onPreparar,
  onToggleFavorito,
  onEditar,
  onDuplicar,
}) => {
  const categoriasCtx = useCategoriasOpcional();
  const categorias = categoriasCtx?.categorias?.length
    ? categoriasCtx.categorias
    : CATEGORIAS_PREDETERMINADAS;

  if (!isOpen || !receta) return null;

  const obtenerNombreCategoria = (catId?: string) => {
    if (!catId) return undefined;
    return categorias.find((c) => c.id === catId)?.nombre ?? catId;
  };

  const puedePreparar = evaluacion?.puedePreparar ?? false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-surface-container rounded-3xl border border-outline w-full max-w-xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🍸</span>
              <h2 className="text-xl font-bold text-on-surface">{receta.nombre}</h2>
              {receta.esPropia ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                  Receta de autor
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-container-high text-on-surface-variant border border-outline-variant">
                  Clásico
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant">{receta.descripcion}</p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onToggleFavorito(receta.id)}
              aria-label={receta.esFavorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
              className="p-1.5 rounded-full text-on-surface-variant hover:text-status-amber hover:bg-surface-container-high transition-colors"
            >
              <svg
                className={`w-5 h-5 ${
                  receta.esFavorito ? 'fill-status-amber text-status-amber' : 'fill-none stroke-current'
                }`}
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal"
              className="p-1.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido con Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Ficha técnica: Cristalería y Método */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-surface border border-outline-variant text-xs">
            <div>
              <span className="text-on-surface-variant block mb-0.5">Cristalería:</span>
              <span className="font-semibold text-on-surface flex items-center gap-1.5">
                🥃 {receta.cristaleria}
              </span>
            </div>
            <div>
              <span className="text-on-surface-variant block mb-0.5">Método de preparación:</span>
              <span className="font-semibold text-on-surface capitalize">
                🌀 {receta.metodoPreparacion || receta.metodo}
              </span>
            </div>
          </div>

          {/* Ingredientes y Disponibilidad en Despensa */}
          <div>
            <h3 className="text-sm font-semibold text-on-surface mb-2.5">
              Ingredientes y Estado en Despensa
            </h3>
            <div className="space-y-2">
              {evaluacion?.ingredientesEvaluados ? (
                evaluacion.ingredientesEvaluados.map((item, idx) => {
                  const esOpcionalFaltante = !item.disponible && Boolean(item.ingrediente.opcional);
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                        item.disponible
                          ? 'bg-status-emerald/5 border-status-emerald/30 text-on-surface'
                          : esOpcionalFaltante
                          ? 'bg-surface border-outline-variant text-on-surface'
                          : 'bg-status-rose/5 border-status-rose/30 text-on-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                            item.disponible
                              ? 'bg-status-emerald text-white'
                              : esOpcionalFaltante
                              ? 'bg-surface-container-high text-on-surface-variant border border-outline'
                              : 'bg-status-rose text-white'
                          }`}
                        >
                          {item.disponible ? '✓' : esOpcionalFaltante ? '○' : '✕'}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium">{item.ingrediente.nombre}</span>
                            {item.ingrediente.tipo === 'bebida' && item.ingrediente.categoriaId && (
                              <span
                                data-testid={`badge-taxonomia-${idx}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-surface-container-high text-on-surface-variant border border-outline-variant"
                              >
                                {obtenerNombreCategoria(item.ingrediente.categoriaId)}
                                {item.ingrediente.subcategoria
                                  ? ` › ${item.ingrediente.subcategoria}`
                                  : ''}
                              </span>
                            )}
                          </div>
                          {item.botellaSugerida && item.disponible ? (
                            <div className="text-[11px] text-on-surface-variant">
                              En despensa: {item.botellaSugerida.marca} - {item.botellaSugerida.nombre} ({item.botellaSugerida.volumenRestanteMl} ml)
                            </div>
                          ) : item.ingrediente.tipo === 'guarnicion_insumo' ? (
                            item.disponible ? (
                              <div className="text-[11px] text-on-surface-variant">
                                En tu almacén: Disponible
                              </div>
                            ) : esOpcionalFaltante ? (
                              <div className="text-[11px] text-on-surface-variant">
                                Opcional — No disponible en tu almacén
                              </div>
                            ) : (
                              <div className="text-[11px] text-status-rose font-medium">
                                No disponible en tu almacén
                              </div>
                            )
                          ) : esOpcionalFaltante ? (
                            <div className="text-[11px] text-on-surface-variant">
                              Opcional — No disponible en tu despensa
                            </div>
                          ) : (
                            <div className="text-[11px] text-status-rose font-medium">
                              No disponible en tu despensa
                            </div>
                          )}
                        </div>
                      </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-on-surface">
                        {item.ingrediente.cantidadMl
                          ? `${item.ingrediente.cantidadMl} ml`
                          : item.ingrediente.unidad || 'al gusto'}
                      </span>
                      {item.ingrediente.opcional && (
                        <span className="block text-[10px] text-on-surface-variant">(Opcional)</span>
                      )}
                    </div>
                  </div>
                );
              })
              ) : (
                receta.ingredientes.map((ing, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-surface border border-outline-variant flex items-center justify-between text-xs"
                  >
                    <span>{ing.nombre}</span>
                    <span className="font-semibold">
                      {ing.cantidadMl ? `${ing.cantidadMl} ml` : ing.unidad || ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Paso a Paso */}
          <div>
            <h3 className="text-sm font-semibold text-on-surface mb-2.5">Paso a Paso</h3>
            <ol className="space-y-2 text-xs text-on-surface">
              {receta.pasos.map((paso, idx) => (
                <li key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-surface">
                  <span className="w-5 h-5 rounded-full bg-surface-container-high border border-outline text-[11px] font-bold text-on-surface-variant flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{paso}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant flex items-center justify-between bg-surface-container">
          <div className="flex items-center gap-2">
            {receta.esPropia ? (
              onEditar && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditar(receta);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  Editar receta
                </button>
              )
            ) : (
              onDuplicar && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDuplicar(receta);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  Duplicar a mis recetas
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onPreparar(receta);
              }}
              disabled={!puedePreparar}
              data-testid="btn-modal-preparar-trago"
              className={`px-5 py-2 rounded-xl text-xs font-medium transition-all shadow-xs ${
                puedePreparar
                  ? 'bg-primary hover:bg-primary-hover text-on-primary'
                  : 'bg-outline text-on-surface-variant cursor-not-allowed opacity-50'
              }`}
            >
              {puedePreparar ? 'Preparar Cóctel' : 'Insumos Insuficientes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

