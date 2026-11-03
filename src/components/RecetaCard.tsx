import React from 'react';
import { EvaluacionReceta } from '../domain/services/recetario-motor';
import { Receta } from '../domain/models/receta';

export interface RecetaCardProps {
  evaluacion: EvaluacionReceta;
  onVerDetalle: (receta: Receta) => void;
  onPreparar: (receta: Receta) => void;
  onToggleFavorito: (id: string) => void;
  onEditar?: (receta: Receta) => void;
  onEliminar?: (receta: Receta) => void;
  onDuplicar?: (receta: Receta) => void;
}

export const RecetaCard: React.FC<RecetaCardProps> = ({
  evaluacion,
  onVerDetalle,
  onPreparar,
  onToggleFavorito,
  onEditar,
  onEliminar,
  onDuplicar,
}) => {
  const { receta, puedePreparar, cantidadFaltantes, ingredientesEvaluados } = evaluacion;

  return (
    <div
      data-testid={`receta-card-${receta.id}`}
      className={`p-5 rounded-2xl bg-surface-container border transition-all duration-200 flex flex-col justify-between gap-4 shadow-xs hover:border-primary/40 ${
        puedePreparar
          ? 'border-status-emerald/50 bg-gradient-to-b from-status-emerald/10 to-surface-container'
          : cantidadFaltantes <= 2
          ? 'border-status-amber/40 bg-gradient-to-b from-status-amber/5 to-surface-container'
          : 'border-outline'
      }`}
    >
      {/* Encabezado y Badges */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {puedePreparar ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-emerald/15 text-status-emerald border border-status-emerald/30">
                🍸 ¡Armar hoy!
              </span>
            ) : cantidadFaltantes <= 2 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-amber/15 text-status-amber border border-status-amber/30">
                ⏳ Falta{cantidadFaltantes > 1 ? 'n' : ''} {cantidadFaltantes} insumo{cantidadFaltantes > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container-high text-on-surface-variant border border-outline">
                Faltan {cantidadFaltantes} insumos
              </span>
            )}

            {receta.esPropia ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                Receta de autor
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-container-high text-on-surface-variant border border-outline-variant">
                Clásico
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onToggleFavorito(receta.id)}
            data-testid={`favorito-receta-${receta.id}`}
            aria-label={receta.esFavorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
            className="p-1.5 -mr-1 -mt-1 rounded-full text-on-surface-variant hover:text-status-amber hover:bg-surface-container-high transition-colors"
          >
            <svg
              className={`w-5 h-5 transition-transform active:scale-125 ${
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
        </div>

        <div>
          <h3 className="font-semibold text-lg text-on-surface line-clamp-1">{receta.nombre}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">
            {receta.descripcion}
          </p>
        </div>

        {/* Metadatos: Cristalería y Método */}
        <div className="flex flex-wrap gap-2 text-xs text-on-surface-variant pt-1 border-t border-outline-variant">
          <span className="flex items-center gap-1">
            🥃 <span className="truncate max-w-[140px]">{receta.cristaleria}</span>
          </span>
          <span className="text-outline">•</span>
          <span className="capitalize">{receta.metodoPreparacion || receta.metodo}</span>
        </div>
      </div>

      {/* Lista rápida de Ingredientes */}
      <div className="flex flex-col gap-1.5 py-1">
        <span className="text-xs font-medium text-on-surface-variant">Ingredientes:</span>
        <ul className="text-xs space-y-1">
          {ingredientesEvaluados.slice(0, 4).map((item, idx) => (
            <li key={idx} className="flex items-center justify-between text-on-surface-variant">
              <span className="flex items-center gap-1.5 truncate">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    item.disponible ? 'bg-status-emerald' : 'bg-status-rose'
                  }`}
                />
                <span className="truncate">{item.ingrediente.nombre}</span>
              </span>
              <span className="text-[11px] opacity-80 shrink-0 ml-2">
                {item.ingrediente.cantidadMl ? `${item.ingrediente.cantidadMl} ml` : item.ingrediente.unidad || ''}
              </span>
            </li>
          ))}
          {ingredientesEvaluados.length > 4 && (
            <li className="text-[11px] text-on-surface-variant italic pl-3.5">
              +{ingredientesEvaluados.length - 4} ingrediente(s) más...
            </li>
          )}
        </ul>
      </div>

      {/* Botones de Acción */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant">
        <div className="flex items-center gap-1">
          {receta.esPropia ? (
            <>
              {onEditar && (
                <button
                  type="button"
                  onClick={() => onEditar(receta)}
                  data-testid={`editar-receta-${receta.id}`}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Editar
                </button>
              )}
              {onEliminar && (
                <button
                  type="button"
                  onClick={() => onEliminar(receta)}
                  data-testid={`eliminar-receta-${receta.id}`}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-status-rose hover:bg-status-rose/10 transition-colors"
                >
                  Eliminar
                </button>
              )}
            </>
          ) : (
            onDuplicar && (
              <button
                type="button"
                onClick={() => onDuplicar(receta)}
                data-testid={`duplicar-receta-${receta.id}`}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                title="Crear una copia editable en mis recetas de autor"
              >
                Duplicar
              </button>
            )
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onVerDetalle(receta)}
            data-testid={`detalle-receta-${receta.id}`}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-primary hover:bg-primary/10 transition-colors border border-primary/20"
          >
            Ver receta
          </button>
          {puedePreparar && (
            <button
              type="button"
              onClick={() => onPreparar(receta)}
              data-testid={`preparar-receta-${receta.id}`}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-primary hover:bg-primary-hover text-on-primary shadow-xs transition-colors"
            >
              Preparar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

