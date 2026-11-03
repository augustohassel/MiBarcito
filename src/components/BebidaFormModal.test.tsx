import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BebidaFormModal } from './BebidaFormModal';
import { Bebida } from '../domain/models/bebida';

describe('BebidaFormModal Component', () => {
  const bebidaEjemplo: Bebida = {
    id: 'b-1',
    nombre: 'Aperol Spritz Base',
    marca: 'Campari Group',
    categoria: 'aperitivo_bitter',
    volumenTotalMl: 750,
    volumenRestanteMl: 400,
    graduacionAlcoholica: 11,
    precioEstimado: 12000,
    stockMinimoMl: 200,
    esFavorito: true,
    fechaCreacion: '2026-11-03T00:00:00Z',
    fechaActualizacion: '2026-11-03T00:00:00Z',
  };

  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <BebidaFormModal isOpen={false} onSave={vi.fn()} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('caso de falla / borde: bloquea envío y resalta campos cuando hay errores de validación', async () => {
    const onSave = vi.fn();
    render(<BebidaFormModal isOpen={true} onSave={onSave} onClose={vi.fn()} />);

    // Dejar campos vacíos o incoherentes
    const inputNombre = screen.getByLabelText(/Nombre de la Bebida/i);
    fireEvent.change(inputNombre, { target: { value: '' } });

    const inputVolTotal = screen.getByLabelText(/Capacidad Total/i);
    fireEvent.change(inputVolTotal, { target: { value: '500' } });

    const inputVolRestante = screen.getByLabelText(/Volumen Restante/i);
    fireEvent.change(inputVolRestante, { target: { value: '800' } }); // Incoherente: 800 > 500

    const btnSubmit = screen.getByRole('button', { name: /Crear Bebida/i });
    fireEvent.click(btnSubmit);

    await waitFor(() => {
      expect(screen.getByText('El nombre de la bebida es obligatorio')).toBeInTheDocument();
      expect(screen.getByText('La marca es obligatoria')).toBeInTheDocument();
      expect(
        screen.getByText('El volumen restante no puede superar el volumen total')
      ).toBeInTheDocument();
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('permite enviar datos válidos en modo creación', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<BebidaFormModal isOpen={true} onSave={onSave} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/Nombre de la Bebida/i), {
      target: { value: 'Vodka Absolut' },
    });
    fireEvent.change(screen.getByLabelText(/Marca \/ Destilería/i), {
      target: { value: 'Absolut' },
    });
    fireEvent.change(screen.getByLabelText(/Categoría/i), {
      target: { value: 'destilado' },
    });
    fireEvent.change(screen.getByLabelText(/Capacidad Total/i), {
      target: { value: '700' },
    });
    fireEvent.change(screen.getByLabelText(/Volumen Restante/i), {
      target: { value: '700' },
    });
    fireEvent.change(screen.getByLabelText(/Graduación/i), {
      target: { value: '40' },
    });
    fireEvent.click(screen.getByLabelText(/Marcar como Favorito/i));

    fireEvent.click(screen.getByRole('button', { name: /Crear Bebida/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        nombre: 'Vodka Absolut',
        marca: 'Absolut',
        categoria: 'destilado',
        volumenTotalMl: 700,
        volumenRestanteMl: 700,
        graduacionAlcoholica: 40,
        precioEstimado: undefined,
        stockMinimoMl: 150,
        esFavorito: true,
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('carga datos existentes en modo edición y permite guardar cambios', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      <BebidaFormModal
        isOpen={true}
        bebidaAEditar={bebidaEjemplo}
        onSave={onSave}
        onClose={onClose}
      />
    );

    expect(screen.getByDisplayValue('Aperol Spritz Base')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Campari Group')).toBeInTheDocument();

    const inputNombre = screen.getByLabelText(/Nombre de la Bebida/i);
    fireEvent.change(inputNombre, { target: { value: 'Aperol Clásico' } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'b-1',
          nombre: 'Aperol Clásico',
          marca: 'Campari Group',
          esFavorito: true,
        })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});
