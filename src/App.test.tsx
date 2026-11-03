import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { InventoryProvider } from './context/InventoryContext';
import { InMemoryInventoryRepository } from './infrastructure/storage/in-memory-inventory-repository';

describe('App Component', () => {
  let mockRepo: InMemoryInventoryRepository;

  beforeEach(() => {
    mockRepo = new InMemoryInventoryRepository();
  });

  it('renderiza la interfaz base de MiBarcito', async () => {
    render(
      <InventoryProvider repository={mockRepo}>
        <App />
      </InventoryProvider>
    );

    expect(screen.getByText('MiBarcito')).toBeInTheDocument();
    expect(screen.getByText(/Gestión de Despensa & Coctelería/i)).toBeInTheDocument();
    expect(screen.getByText('PWA Ready')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Tu bar está vacío por ahora/i)).toBeInTheDocument();
    });
  });

  it('permite agregar una botella de prueba y actualizar el inventario', async () => {
    render(
      <InventoryProvider repository={mockRepo}>
        <App />
      </InventoryProvider>
    );

    const btnAgregar = screen.getByRole('button', { name: /\+ Agregar Botella de Prueba/i });
    fireEvent.click(btnAgregar);

    await waitFor(() => {
      expect(screen.getByText('Gin London Dry')).toBeInTheDocument();
      expect(screen.getByText(/Bombay Sapphire/i)).toBeInTheDocument();
      expect(screen.getByText('Stock Bajo')).toBeInTheDocument();
    });
  });
});

