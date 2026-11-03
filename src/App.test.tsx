import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { InventoryProvider } from './context/InventoryContext';
import { InMemoryInventoryRepository } from './infrastructure/storage/in-memory-inventory-repository';

describe('App Component - Gestión de Despensa e Inventario', () => {
  let mockRepo: InMemoryInventoryRepository;

  beforeEach(() => {
    mockRepo = new InMemoryInventoryRepository();
  });

  it('renderiza la interfaz base de MiBarcito con métricas y controles iniciales', async () => {
    render(
      <InventoryProvider repository={mockRepo}>
        <App />
      </InventoryProvider>
    );

    expect(screen.getByText('MiBarcito')).toBeInTheDocument();
    expect(screen.getAllByText(/Gestión de Despensa & Coctelería/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('PWA Ready')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Tu bar está vacío por ahora/i)).toBeInTheDocument();
    });
  });

  it('permite agregar una botella de prueba y actualizar las métricas', async () => {
    render(
      <InventoryProvider repository={mockRepo}>
        <App />
      </InventoryProvider>
    );

    const btnAgregar = screen.getByRole('button', { name: /\+ Botella de Prueba/i });
    fireEvent.click(btnAgregar);

    await waitFor(() => {
      expect(screen.getByText('Gin London Dry')).toBeInTheDocument();
      expect(screen.getByText(/Bombay Sapphire/i)).toBeInTheDocument();
      expect(screen.getByText('⚠️ Stock Bajo')).toBeInTheDocument();
      expect(screen.getByText('250 / 750 ml (33%)')).toBeInTheDocument();
    });
  });

  it('permite crear una nueva bebida mediante el formulario modal', async () => {
    render(
      <InventoryProvider repository={mockRepo}>
        <App />
      </InventoryProvider>
    );

    // Abrir modal
    fireEvent.click(screen.getByRole('button', { name: /Nueva Bebida/i }));

    expect(screen.getByText('Agregar Nueva Bebida')).toBeInTheDocument();

    // Completar campos
    fireEvent.change(screen.getByLabelText(/Nombre de la Bebida/i), {
      target: { value: 'Fernet Branca Clásico' },
    });
    fireEvent.change(screen.getByLabelText(/Marca \/ Destilería/i), {
      target: { value: 'Fratelli Branca' },
    });
    fireEvent.change(screen.getByLabelText(/Categoría/i), {
      target: { value: 'aperitivo_bitter' },
    });
    fireEvent.change(screen.getByLabelText(/Capacidad Total/i), {
      target: { value: '750' },
    });
    fireEvent.change(screen.getByLabelText(/Volumen Restante/i), {
      target: { value: '750' },
    });
    fireEvent.click(screen.getByLabelText(/Marcar como Favorito/i));

    fireEvent.click(screen.getByRole('button', { name: /Crear Bebida/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Fernet Branca Clásico' })).toBeInTheDocument();
      expect(screen.getByText(/Fratelli Branca/i)).toBeInTheDocument();
      expect(screen.getAllByText('Aperitivo / Bitter').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('permite editar una bebida existente', async () => {
    render(
      <InventoryProvider repository={mockRepo}>
        <App />
      </InventoryProvider>
    );

    // Agregar muestra inicial
    fireEvent.click(screen.getByRole('button', { name: /\+ Botella de Prueba/i }));
    await waitFor(() => {
      expect(screen.getByText('Gin London Dry')).toBeInTheDocument();
    });

    // Abrir modal de edición
    fireEvent.click(screen.getByRole('button', { name: /Editar/i }));
    expect(screen.getByText('Editar Bebida')).toBeInTheDocument();

    // Modificar nombre
    const inputNombre = screen.getByLabelText(/Nombre de la Bebida/i);
    fireEvent.change(inputNombre, { target: { value: 'Gin London Dry Premium' } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    await waitFor(() => {
      expect(screen.getByText('Gin London Dry Premium')).toBeInTheDocument();
    });
  });

  it('permite alternar favoritos y filtrar por favoritos', async () => {
    render(
      <InventoryProvider repository={mockRepo}>
        <App />
      </InventoryProvider>
    );

    // Agregar muestra inicial (inicia favorita)
    fireEvent.click(screen.getByRole('button', { name: /\+ Botella de Prueba/i }));
    await waitFor(() => {
      expect(screen.getByText('Gin London Dry')).toBeInTheDocument();
    });

    // Desmarcar favorito
    const btnFav = screen.getByRole('button', { name: /Quitar de favoritos/i });
    fireEvent.click(btnFav);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Agregar a favoritos/i })).toBeInTheDocument();
    });

    // Activar filtro "Solo Favoritos"
    fireEvent.click(screen.getByRole('button', { name: /Solo Favoritos/i }));

    // No debe verse la botella porque ahora no es favorita
    await waitFor(() => {
      expect(screen.getByText(/No se encontraron botellas con los filtros actuales/i)).toBeInTheDocument();
    });
  });

  it('permite ajuste rápido de volumen restante', async () => {
    render(
      <InventoryProvider repository={mockRepo}>
        <App />
      </InventoryProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /\+ Botella de Prueba/i }));
    await waitFor(() => {
      expect(screen.getByText('250 / 750 ml (33%)')).toBeInTheDocument();
    });

    // Sumar 50 ml
    fireEvent.click(screen.getByRole('button', { name: /\+50 ml/i }));
    await waitFor(() => {
      expect(screen.getByText('300 / 750 ml (40%)')).toBeInTheDocument();
    });

    // Restar 50 ml
    fireEvent.click(screen.getByRole('button', { name: /-50 ml/i }));
    await waitFor(() => {
      expect(screen.getByText('250 / 750 ml (33%)')).toBeInTheDocument();
    });
  });

  it('solicita confirmación antes de eliminar una bebida y la elimina si se confirma', async () => {
    render(
      <InventoryProvider repository={mockRepo}>
        <App />
      </InventoryProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /\+ Botella de Prueba/i }));
    await waitFor(() => {
      expect(screen.getByText('Gin London Dry')).toBeInTheDocument();
    });

    // Click eliminar
    fireEvent.click(screen.getByRole('button', { name: /Eliminar/i }));

    // Diálogo modal de confirmación
    expect(screen.getByText(/¿Estás seguro de que deseás eliminar/i)).toBeInTheDocument();

    // Cancelar primero
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Gin London Dry')).toBeInTheDocument();

    // Eliminar y confirmar
    fireEvent.click(screen.getByRole('button', { name: /Eliminar/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));

    await waitFor(() => {
      expect(screen.getByText(/Tu bar está vacío por ahora/i)).toBeInTheDocument();
    });
  });
});
