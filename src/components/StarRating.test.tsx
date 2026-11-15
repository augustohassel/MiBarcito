import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StarRating } from './StarRating';

describe('StarRating Component', () => {
  it('renderiza 5 estrellas vacías cuando rating es undefined y muestra texto opcional', () => {
    render(<StarRating rating={undefined} onChange={vi.fn()} showValue />);

    const stars = screen.getAllByRole('button');
    expect(stars).toHaveLength(5);
    stars.forEach((btn) => {
      expect(btn).toHaveTextContent('☆');
      expect(btn).toHaveAttribute('aria-pressed', 'false');
    });
    expect(screen.getByText('Sin calificar')).toBeInTheDocument();
  });

  it('renderiza estrellas llenas hasta el rating actual y selecciona nuevo puntaje', () => {
    const onChange = vi.fn();
    render(<StarRating rating={3} onChange={onChange} showValue testIdPrefix="test-rating" />);

    expect(screen.getByTestId('test-rating-star-1')).toHaveTextContent('★');
    expect(screen.getByTestId('test-rating-star-2')).toHaveTextContent('★');
    expect(screen.getByTestId('test-rating-star-3')).toHaveTextContent('★');
    expect(screen.getByTestId('test-rating-star-3')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('test-rating-star-4')).toHaveTextContent('☆');
    expect(screen.getByTestId('test-rating-star-5')).toHaveTextContent('☆');
    expect(screen.getByText('3/5')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('test-rating-star-4'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('limpia la calificación (undefined) al volver a pulsar la estrella del puntaje actual', () => {
    const onChange = vi.fn();
    render(<StarRating rating={3} onChange={onChange} testIdPrefix="test-clear" />);

    fireEvent.click(screen.getByTestId('test-clear-star-3'));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('renderiza modo solo lectura sin botones interactivos', () => {
    render(<StarRating rating={4} readOnly showValue testIdPrefix="ro" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const img = screen.getByRole('img', { name: 'Calificación: 4 de 5 estrellas' });
    expect(img).toBeInTheDocument();
    expect(screen.getByTestId('ro-readonly')).toHaveTextContent('★★★★☆');
    expect(screen.getByText('4/5')).toBeInTheDocument();
  });
});
