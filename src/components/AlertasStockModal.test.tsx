import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertasStockModal } from './AlertasStockModal';
import { Bebida } from '../domain/models/bebida';
import { BebidaAlertaStock } from '../domain/services/metricas-bar';

describe('AlertasStockModal', () => {
  const bebidaMock: Bebida = {
    id: 'b-1',
    nombre: 'Aperol Spritz Insumo',
    marca: 'Aperol',
    categoria: 'aperitivo_bitter',
    volumenTotalMl: 750,
    volumenRestanteMl: 100,
    stockMinimoMl: 250,
    precioEstimado: 8500,
    fechaCreacion: '',
    fechaActualizacion: '',
  };

  const alertasMock: BebidaAlertaStock[] = [
    {
      bebida: bebidaMock,
      stockMinimoMl: 250,
      volumenRestanteMl: 100,
      volumenFaltanteMl: 150,
      porcentajeRestante: 13,
    },
  ];

  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <AlertasStockModal isOpen={false} onClose={vi.fn()} alertas={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('muestra estado vacío amigable cuando no hay alertas de stock', () => {
    render(<AlertasStockModal isOpen={true} onClose={vi.fn()} alertas={[]} />);
    expect(screen.getByText('¡Todo en orden en tu bar!')).toBeInTheDocument();
  });

  it('renderiza la lista de alertas con detalles de volumen y faltantes', () => {
    render(<AlertasStockModal isOpen={true} onClose={vi.fn()} alertas={alertasMock} />);

    expect(screen.getByText('Alertas de Stock Bajo')).toBeInTheDocument();
    expect(screen.getByText('Aperol Spritz Insumo')).toBeInTheDocument();
    expect(screen.getByText(/Restan 100 ml/i)).toBeInTheDocument();
    expect(screen.getByText(/Umbral: 250 ml/i)).toBeInTheDocument();
    expect(screen.getByText(/Faltan/i)).toBeInTheDocument();
    expect(screen.getByText(/150 ml/i)).toBeInTheDocument();
  });

  it('ejecuta onAjustarVolumen al hacer click en acciones rápidas de reposición', () => {
    const onAjustarVolumen = vi.fn();
    render(
      <AlertasStockModal
        isOpen={true}
        onClose={vi.fn()}
        alertas={alertasMock}
        onAjustarVolumen={onAjustarVolumen}
      />
    );

    const btnSumar250 = screen.getByText('+250 ml');
    fireEvent.click(btnSumar250);
    expect(onAjustarVolumen).toHaveBeenCalledWith(bebidaMock, 350);

    const btnBotellaLlena = screen.getByText(/Botella Llena \(750 ml\)/i);
    fireEvent.click(btnBotellaLlena);
    expect(onAjustarVolumen).toHaveBeenCalledWith(bebidaMock, 750);
  });

  it('llama a onEditarBebida y onClose al hacer click en Editar Ficha', () => {
    const onEditar = vi.fn();
    const onClose = vi.fn();
    render(
      <AlertasStockModal
        isOpen={true}
        onClose={onClose}
        alertas={alertasMock}
        onEditarBebida={onEditar}
      />
    );

    const btnEditar = screen.getByText(/Editar Ficha ✏️/i);
    fireEvent.click(btnEditar);
    expect(onEditar).toHaveBeenCalledWith(bebidaMock);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra el diálogo al presionar Escape', () => {
    const onClose = vi.fn();
    render(<AlertasStockModal isOpen={true} onClose={onClose} alertas={alertasMock} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
