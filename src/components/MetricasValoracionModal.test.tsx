import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetricasValoracionModal } from './MetricasValoracionModal';
import { MetricasValoracion } from '../domain/services/metricas-bar';

describe('MetricasValoracionModal', () => {
  const metricasMock: MetricasValoracion = {
    costoTotal: 12000,
    costoTotalLleno: 18000,
    valorActualProrrateado: 12000,
    costoReposicion: 8000,
    botellasPorReponer: 2,
    botellasReposicionSinPrecio: 1,
    totalBotellas: 5,
    botellasCotizadas: 3,
    botellasSinPrecio: 2,
    botellasArchivadas: 1,
    distribucionCategorias: [
      {
        categoriaId: 'destilado',
        categoriaNombre: 'Destilado',
        totalCosto: 10000,
        porcentaje: 66.7,
        cantidadBotellas: 2,
      },
      {
        categoriaId: 'licor',
        categoriaNombre: 'Licor',
        totalCosto: 5000,
        porcentaje: 33.3,
        cantidadBotellas: 1,
      },
    ],
  };

  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <MetricasValoracionModal isOpen={false} onClose={vi.fn()} metricas={metricasMock} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('muestra el costo total, botellas cotizadas y el aviso de botellas sin precio', () => {
    render(<MetricasValoracionModal isOpen={true} onClose={vi.fn()} metricas={metricasMock} />);

    expect(screen.getByText('Valoración del Bar')).toBeInTheDocument();
    expect(screen.getByText('Valor Actual en Líquido')).toBeInTheDocument();
    expect(screen.getByText('Capacidad Plena (100%)')).toBeInTheDocument();
    expect(screen.getByText('Costo de Reposición')).toBeInTheDocument();
    expect(screen.getByText(/3 de 5 botella\(s\) cotizadas/i)).toBeInTheDocument();
    expect(screen.getByText(/1 archivada\(s\)/i)).toBeInTheDocument();

    const aviso = screen.getByTestId('aviso-botellas-sin-precio');
    expect(aviso).toBeInTheDocument();
    expect(aviso).toHaveTextContent(/2 botellas sin precio estimado/i);

    const avisoRepo = screen.getByTestId('aviso-reposicion-sin-precio');
    expect(avisoRepo).toBeInTheDocument();
    expect(avisoRepo).toHaveTextContent(/1 botella por reponer sin cotización/i);
  });

  it('no muestra el aviso de botellas sin precio cuando botellasSinPrecio es 0', () => {
    const metricasCompletas: MetricasValoracion = {
      ...metricasMock,
      botellasSinPrecio: 0,
      botellasCotizadas: 5,
    };

    render(
      <MetricasValoracionModal isOpen={true} onClose={vi.fn()} metricas={metricasCompletas} />
    );

    expect(screen.queryByTestId('aviso-botellas-sin-precio')).toBeNull();
  });

  it('renderiza la lista de categorías con sus porcentajes y subtotales', () => {
    render(<MetricasValoracionModal isOpen={true} onClose={vi.fn()} metricas={metricasMock} />);

    expect(screen.getByText('Destilado')).toBeInTheDocument();
    expect(screen.getByText(/66.7%/i)).toBeInTheDocument();
    expect(screen.getByText('Licor')).toBeInTheDocument();
    expect(screen.getByText(/33.3%/i)).toBeInTheDocument();
  });

  it('llama a onClose al presionar Escape o hacer click en cerrar', () => {
    const onClose = vi.fn();
    render(<MetricasValoracionModal isOpen={true} onClose={onClose} metricas={metricasMock} />);

    fireEvent.click(screen.getByLabelText('Cerrar modal de métricas'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
