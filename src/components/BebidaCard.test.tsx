import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BebidaCard } from './BebidaCard';
import { Bebida } from '../domain/models/bebida';

describe('BebidaCard Component', () => {
  const bebidaMock: Bebida = {
    id: 'test-card-1',
    nombre: 'Whisky Single Malt',
    marca: 'Glenfiddich',
    categoria: 'destilado',
    volumenTotalMl: 700,
    volumenRestanteMl: 350,
    graduacionAlcoholica: 40,
    precioEstimado: 45000,
    stockMinimoMl: 100,
    esFavorito: false,
    fechaCreacion: '2026-11-03T00:00:00Z',
    fechaActualizacion: '2026-11-03T00:00:00Z',
  };

  it('renderiza correctamente el nombre, marca, volumen y categoría', () => {
    render(
      <BebidaCard
        bebida={bebidaMock}
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
        onToggleFavorito={vi.fn()}
        onAjustarVolumen={vi.fn()}
      />
    );

    expect(screen.getByText('Whisky Single Malt')).toBeInTheDocument();
    expect(screen.getByText('Glenfiddich')).toBeInTheDocument();
    expect(screen.getByText('Destilado')).toBeInTheDocument();
    expect(screen.getByText(/350 \/ 700 ml \(50%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/40% ABV/i)).toBeInTheDocument();
  });

  it('muestra badge de stock bajo cuando el volumen restante es menor o igual al umbral', () => {
    const bebidaBajoStock: Bebida = {
      ...bebidaMock,
      volumenRestanteMl: 80,
      stockMinimoMl: 100,
    };

    render(
      <BebidaCard
        bebida={bebidaBajoStock}
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
        onToggleFavorito={vi.fn()}
        onAjustarVolumen={vi.fn()}
      />
    );

    expect(screen.getByText(/Stock Bajo/i)).toBeInTheDocument();
  });

  it('dispara onToggleFavorito al hacer click en la estrella', () => {
    const onToggle = vi.fn();
    render(
      <BebidaCard
        bebida={bebidaMock}
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
        onToggleFavorito={onToggle}
        onAjustarVolumen={vi.fn()}
      />
    );

    const btnFav = screen.getByRole('button', { name: /Agregar a favoritos/i });
    fireEvent.click(btnFav);
    expect(onToggle).toHaveBeenCalledWith(bebidaMock);
  });

  it('permite ajuste rápido de volumen (-50ml, +50ml y 100%)', () => {
    const onAjustar = vi.fn();
    render(
      <BebidaCard
        bebida={bebidaMock}
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
        onToggleFavorito={vi.fn()}
        onAjustarVolumen={onAjustar}
      />
    );

    // Click -50 ml
    fireEvent.click(screen.getByRole('button', { name: /-50 ml/i }));
    expect(onAjustar).toHaveBeenCalledWith(bebidaMock, 300);

    // Click +50 ml
    fireEvent.click(screen.getByRole('button', { name: /\+50 ml/i }));
    expect(onAjustar).toHaveBeenCalledWith(bebidaMock, 400);

    // Click 100%
    fireEvent.click(screen.getByRole('button', { name: /100%/i }));
    expect(onAjustar).toHaveBeenCalledWith(bebidaMock, 700);
  });

  it('dispara onEditar y onEliminar con los datos de la bebida', () => {
    const onEditar = vi.fn();
    const onEliminar = vi.fn();

    render(
      <BebidaCard
        bebida={bebidaMock}
        onEditar={onEditar}
        onEliminar={onEliminar}
        onToggleFavorito={vi.fn()}
        onAjustarVolumen={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Editar/i }));
    expect(onEditar).toHaveBeenCalledWith(bebidaMock);

    fireEvent.click(screen.getByRole('button', { name: /Eliminar/i }));
    expect(onEliminar).toHaveBeenCalledWith(bebidaMock);
  });

  it('permite abrir la ficha técnica mediante el botón Ficha o la cabecera interactiva', () => {
    const onVerFicha = vi.fn();

    render(
      <BebidaCard
        bebida={bebidaMock}
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
        onToggleFavorito={vi.fn()}
        onAjustarVolumen={vi.fn()}
        onVerFicha={onVerFicha}
      />
    );

    // Botón Ficha en el footer
    const btnFicha = screen.getByRole('button', { name: /^Ver ficha técnica/i });
    fireEvent.click(btnFicha);
    expect(onVerFicha).toHaveBeenCalledTimes(1);
    expect(onVerFicha).toHaveBeenCalledWith(bebidaMock);

    // Cabecera interactiva
    const headerFicha = screen.getByRole('button', { name: /^Abrir ficha técnica/i });
    fireEvent.click(headerFicha);
    expect(onVerFicha).toHaveBeenCalledTimes(2);
  });

  it('muestra la subcategoría si es válida y la oculta si fue eliminada de la taxonomía', () => {
    const bebidaConSubcat: Bebida = {
      ...bebidaMock,
      subcategoria: 'Whisky',
    };

    const { rerender } = render(
      <BebidaCard
        bebida={bebidaConSubcat}
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
        onToggleFavorito={vi.fn()}
        onAjustarVolumen={vi.fn()}
      />
    );

    expect(screen.getByText('Whisky')).toBeInTheDocument();

    const bebidaConSubcatInvalida: Bebida = {
      ...bebidaMock,
      subcategoria: 'SubcatInexistente',
    };

    rerender(
      <BebidaCard
        bebida={bebidaConSubcatInvalida}
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
        onToggleFavorito={vi.fn()}
        onAjustarVolumen={vi.fn()}
      />
    );

    expect(screen.queryByText('SubcatInexistente')).not.toBeInTheDocument();
  });

  it('soporta notas, badge de recompra y botón de archivar/desarchivar (#53)', () => {
    const onToggleArchivar = vi.fn();
    const bebidaAvanzada: Bebida = {
      ...bebidaMock,
      notas: 'Notas florales con final ahumado persistente.',
      recomprar: true,
      archivada: false,
    };

    const { rerender } = render(
      <BebidaCard
        bebida={bebidaAvanzada}
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
        onToggleFavorito={vi.fn()}
        onAjustarVolumen={vi.fn()}
        onToggleArchivar={onToggleArchivar}
      />
    );

    expect(screen.getByText(/"Notas florales con final ahumado persistente\."/i)).toBeInTheDocument();
    expect(screen.getByText('Recomprar')).toBeInTheDocument();

    const btnArchivar = screen.getByRole('button', { name: /Archivar/i });
    fireEvent.click(btnArchivar);
    expect(onToggleArchivar).toHaveBeenCalledWith(bebidaAvanzada);

    // Rerender como archivada
    rerender(
      <BebidaCard
        bebida={{ ...bebidaAvanzada, archivada: true }}
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
        onToggleFavorito={vi.fn()}
        onAjustarVolumen={vi.fn()}
        onToggleArchivar={onToggleArchivar}
      />
    );

    expect(screen.getByText(/Archivada/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Desarchivar/i })).toBeInTheDocument();
  });
});

