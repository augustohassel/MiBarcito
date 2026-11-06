import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';
import { InventoryProvider } from './context/InventoryContext';
import { InMemoryInventoryRepository } from './infrastructure/storage/in-memory-inventory-repository';
import { InMemoryCategoriaRepository } from './infrastructure/storage/in-memory-categoria-repository';
import { InMemoryRecetaRepository } from './infrastructure/storage/in-memory-receta-repository';
import { InMemoryAlmacenRepository } from './infrastructure/storage/in-memory-almacen-repository';

describe('App Component - Integración y Resiliencia de Almacén (Issue #59)', () => {
  let mockInventoryRepo: InMemoryInventoryRepository;
  let mockCatRepo: InMemoryCategoriaRepository;
  let mockRecetaRepo: InMemoryRecetaRepository;
  let mockAlmacenRepo: InMemoryAlmacenRepository;

  beforeEach(() => {
    localStorage.clear();
    mockInventoryRepo = new InMemoryInventoryRepository();
    mockCatRepo = new InMemoryCategoriaRepository();
    mockRecetaRepo = new InMemoryRecetaRepository();
    mockAlmacenRepo = new InMemoryAlmacenRepository();
  });

  const renderApp = () =>
    render(
      <InventoryProvider
        repository={mockInventoryRepo}
        categoriaRepository={mockCatRepo}
        recetaRepository={mockRecetaRepo}
        almacenRepository={mockAlmacenRepo}
      >
        <App />
      </InventoryProvider>
    );

  it('permite alternar a la pestaña de Almacén y muestra el catálogo básico inicial', async () => {
    renderApp();

    const tabAlmacen = screen.getByTestId('tab-almacen');
    expect(tabAlmacen).toBeInTheDocument();
    fireEvent.click(tabAlmacen);

    await waitFor(() => {
      expect(screen.getByText('Limón (rodaja o piel)')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Hielo' })).toBeInTheDocument();
      expect(screen.getByText('Menta fresca')).toBeInTheDocument();
    });

    expect(screen.getByTestId('btn-nuevo-insumo')).toBeInTheDocument();
  });

  it('realiza rollback y emite toast de error si la persistencia de disponibilidad (toggle) falla', async () => {
    renderApp();
    fireEvent.click(screen.getByTestId('tab-almacen'));

    await waitFor(() => {
      expect(screen.getByText('Limón (rodaja o piel)')).toBeInTheDocument();
    });

    // Insumo predeterminado 'insumo-limon' está inicialmente en disponible: false
    const toggleBtn = screen.getByTestId('toggle-insumo-insumo-limon');
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(toggleBtn).toHaveTextContent(/No tengo/i);

    // Simular fallo en almacenRepository
    const spyToggle = vi
      .spyOn(mockAlmacenRepo, 'toggleDisponible')
      .mockRejectedValueOnce(new Error('QuotaExceededError'));

    fireEvent.click(toggleBtn);

    // Debe mostrar la notificación toast descriptiva de error
    await waitFor(() => {
      expect(
        screen.getByText(
          /No se pudo actualizar la disponibilidad del insumo: error al guardar en el almacenamiento local/i
        )
      ).toBeInTheDocument();
    });

    // El estado del botón debe revertirse automáticamente al snapshot previo (disponible: false)
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(toggleBtn).toHaveTextContent(/No tengo/i);

    spyToggle.mockRestore();
  });

  it('realiza rollback, emite toast y preserva el formulario si falla el guardado de nuevo insumo', async () => {
    renderApp();
    fireEvent.click(screen.getByTestId('tab-almacen'));

    await waitFor(() => {
      expect(screen.getByTestId('btn-nuevo-insumo')).toBeInTheDocument();
    });

    // Abrir formulario
    fireEvent.click(screen.getByTestId('btn-nuevo-insumo'));

    const inputNombre = screen.getByTestId('input-nombre-insumo');
    fireEvent.change(inputNombre, { target: { value: 'Maracuyá Exótico' } });

    // Simular fallo en save
    const spySave = vi
      .spyOn(mockAlmacenRepo, 'save')
      .mockRejectedValueOnce(new Error('QuotaExceededError'));

    fireEvent.click(screen.getByTestId('btn-guardar-insumo'));

    // Debe mostrar toast de error
    await waitFor(() => {
      expect(
        screen.getByText(
          /No se pudo guardar el insumo: error al persistir en el almacenamiento local/i
        )
      ).toBeInTheDocument();
    });

    // El formulario debe seguir visible y el texto tipeado debe preservarse para reintentar
    expect(screen.getByTestId('form-nuevo-insumo')).toBeInTheDocument();
    expect(screen.getByTestId('input-nombre-insumo')).toHaveValue('Maracuyá Exótico');

    // El insumo no debe persistir en la grilla
    expect(screen.queryByText('Maracuyá Exótico')).not.toBeInTheDocument();

    spySave.mockRestore();
  });

  it('guarda con éxito un insumo, muestra toast de confirmación y resetea el formulario', async () => {
    renderApp();
    fireEvent.click(screen.getByTestId('tab-almacen'));

    await waitFor(() => {
      expect(screen.getByTestId('btn-nuevo-insumo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-nuevo-insumo'));
    fireEvent.change(screen.getByTestId('input-nombre-insumo'), {
      target: { value: 'Albahaca fresca' },
    });
    fireEvent.click(screen.getByTestId('btn-guardar-insumo'));

    // Toast de confirmación
    await waitFor(() => {
      expect(
        screen.getByText(/Insumo "Albahaca fresca" guardado en el almacén/i)
      ).toBeInTheDocument();
    });

    // El insumo aparece en la grilla y el formulario se cerró
    expect(screen.getByText('Albahaca fresca')).toBeInTheDocument();
    expect(screen.queryByTestId('form-nuevo-insumo')).not.toBeInTheDocument();
  });

  it('realiza rollback y emite toast de error si la eliminación de un insumo personalizado falla', async () => {
    renderApp();
    fireEvent.click(screen.getByTestId('tab-almacen'));

    // Primero creamos un insumo personalizado exitosamente
    await waitFor(() => {
      expect(screen.getByTestId('btn-nuevo-insumo')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('btn-nuevo-insumo'));
    fireEvent.change(screen.getByTestId('input-nombre-insumo'), {
      target: { value: 'Jengibre rallado' },
    });
    fireEvent.click(screen.getByTestId('btn-guardar-insumo'));

    await waitFor(() => {
      expect(screen.getByText('Jengibre rallado')).toBeInTheDocument();
    });

    // Buscar el botón de eliminar del insumo creado
    const itemCard = screen.getByText('Jengibre rallado').closest('div[data-testid^="card-insumo-"]');
    expect(itemCard).toBeInTheDocument();
    const btnEliminar = itemCard!.querySelector('button[title="Eliminar insumo personalizado"]');
    expect(btnEliminar).toBeInTheDocument();

    // Simular error al eliminar en el repositorio
    const spyDelete = vi
      .spyOn(mockAlmacenRepo, 'delete')
      .mockRejectedValueOnce(new Error('QuotaExceededError'));

    fireEvent.click(btnEliminar!);

    // Debe mostrar toast de error
    await waitFor(() => {
      expect(
        screen.getByText(
          /No se pudo eliminar el insumo: error al persistir en el almacenamiento local/i
        )
      ).toBeInTheDocument();
    });

    // El insumo debe restituirse inmediatamente en la lista visible
    expect(screen.getByText('Jengibre rallado')).toBeInTheDocument();

    spyDelete.mockRestore();
  });
});

