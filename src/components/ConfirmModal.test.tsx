import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmModal } from './ConfirmModal';

describe('ConfirmModal Component', () => {
  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <ConfirmModal
        isOpen={false}
        titulo="Eliminar Bebida"
        mensaje="¿Estás seguro?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza título, mensaje y dispara onConfirm y onCancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        titulo="Eliminar Bebida"
        mensaje="¿Seguro que deseás eliminar Campari?"
        textoConfirmar="Sí, eliminar"
        textoCancelar="Volver"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Eliminar Bebida')).toBeInTheDocument();
    expect(screen.getByText('¿Seguro que deseás eliminar Campari?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Volver'));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Sí, eliminar'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cierra el modal al presionar la tecla Escape', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        isOpen={true}
        titulo="Confirmación"
        mensaje="Prueba"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

