import React from 'react';

export interface StarRatingProps {
  rating?: number;
  onChange?: (nuevoRating?: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  testIdPrefix?: string;
  showValue?: boolean;
}

const ESTRELLAS = [1, 2, 3, 4, 5] as const;

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-sm leading-none',
  md: 'text-lg leading-none',
  lg: 'text-2xl leading-none',
};

/**
 * Control reutilizable de calificación entera de 1 a 5 estrellas.
 * Permite limpiar la calificación (undefined) al volver a pulsar la estrella activa.
 */
export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onChange,
  readOnly = false,
  size = 'md',
  label = 'Calificación',
  testIdPrefix,
  showValue = false,
}) => {
  const sizeClass = SIZE_CLASSES[size];
  const esSoloLectura = readOnly || !onChange;

  return (
    <div
      role={esSoloLectura ? 'img' : 'group'}
      aria-label={
        esSoloLectura
          ? rating
            ? `Calificación: ${rating} de 5 estrellas`
            : 'Sin calificar'
          : label
      }
      data-testid={
        testIdPrefix
          ? `${testIdPrefix}-${esSoloLectura ? 'readonly' : 'container'}`
          : esSoloLectura
            ? 'star-rating-readonly'
            : 'star-rating'
      }
      className="inline-flex items-center gap-0.5"
    >
      {ESTRELLAS.map((star) => {
        const activa = star <= (rating ?? 0);
        if (esSoloLectura) {
          return (
            <span
              key={star}
              aria-hidden="true"
              className={`${sizeClass} ${
                activa ? 'text-status-amber' : 'text-on-surface-variant/40'
              }`}
            >
              {activa ? '★' : '☆'}
            </span>
          );
        }

        const esActual = rating === star;
        const sufijo = star === 1 ? 'estrella' : 'estrellas';
        const ariaLabel = esActual
          ? `Quitar calificación de ${star} ${sufijo}`
          : `Calificar con ${star} ${sufijo}`;

        return (
          <button
            key={star}
            type="button"
            data-testid={testIdPrefix ? `${testIdPrefix}-star-${star}` : `star-rating-${star}`}
            aria-label={ariaLabel}
            aria-pressed={esActual}
            title={ariaLabel}
            onClick={(e) => {
              e.stopPropagation();
              onChange(esActual ? undefined : star);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
              }
            }}
            className={`${sizeClass} p-0.5 rounded transition-transform hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary ${
              activa
                ? 'text-status-amber'
                : 'text-on-surface-variant/60 hover:text-status-amber/80'
            }`}
          >
            {activa ? '★' : '☆'}
          </button>
        );
      })}
      {showValue && (
        <span className="text-xs text-on-surface-variant ml-1.5">
          {rating ? `${rating}/5` : 'Sin calificar'}
        </span>
      )}
    </div>
  );
};
