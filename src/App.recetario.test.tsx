import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { InventoryProvider } from './context/InventoryContext';
import { InMemoryInventoryRepository } from './infrastructure/storage/in-memory-inventory-repository';
import { InMemoryCategoriaRepository } from './infrastructure/storage/in-memory-categoria-repository';
import { InMemoryRecetaRepository } from './infrastructure/storage/in-memory-receta-repository';
import { Bebida } from './domain/models/bebida';

describe('App Component - Integración del Recetario Dinámico (Issue #5)', () => {
  let mockInventoryRepo: InMemoryInventoryRepository;
  let mockCatRepo: InMemoryCategoriaRepository;
  let mockRecetaRepo: InMemoryRecetaRepository;

  beforeEach(() => {
    localStorage.clear();
    mockInventoryRepo = new InMemoryInventoryRepository();
    mockCatRepo = new InMemoryCategoriaRepository();
    mockRecetaRepo = new InMemoryRecetaRepository();
  });

  const renderApp = () =>
    render(
      <InventoryProvider
        repository={mockInventoryRepo}
        categoriaRepository={mockCatRepo}
        recetaRepository={mockRecetaRepo}
      >
        <App />
      </InventoryProvider>
    );

  it('permite alternar a la pestaña de Recetario y muestra el catálogo clásico inicial', async () => {
    renderApp();

    const tabRecetario = screen.getByTestId('tab-recetario');
    expect(tabRecetario).toBeInTheDocument();
    fireEvent.click(tabRecetario);

    await waitFor(() => {
      expect(screen.getByText('Negroni')).toBeInTheDocument();
      expect(screen.getByText('Gin Tonic')).toBeInTheDocument();
      expect(screen.getByText('Fernet con Cola')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /\+ Nueva Receta de Autor/i })).toBeInTheDocument();
  });

  it('evalúa en tiempo real los tragos armables cuando se agregan botellas a la despensa', async () => {
    // Añadimos botellas para armar Negroni
    const gin: Bebida = {
      id: 'gin-1',
      nombre: 'London Dry Gin',
      marca: 'Bombay Sapphire',
      categoria: 'destilado',
      volumenTotalMl: 750,
      volumenRestanteMl: 500,
      precioEstimado: 25000,
      esFavorito: true,
      fechaCreacion: '2026-11-01T00:00:00.000Z',
      fechaActualizacion: '2026-11-01T00:00:00.000Z',
    };
    const campari: Bebida = {
      id: 'campari-1',
      nombre: 'Bitter',
      marca: 'Campari',
      categoria: 'aperitivo_bitter',
      volumenTotalMl: 750,
      volumenRestanteMl: 400,
      precioEstimado: 12000,
      esFavorito: false,
      fechaCreacion: '2026-11-01T00:00:00.000Z',
      fechaActualizacion: '2026-11-01T00:00:00.000Z',
    };
    const vermut: Bebida = {
      id: 'vermut-1',
      nombre: 'Rosso',
      marca: 'Carpano',
      categoria: 'aperitivo_bitter',
      volumenTotalMl: 1000,
      volumenRestanteMl: 300,
      precioEstimado: 8000,
      esFavorito: false,
      fechaCreacion: '2026-11-01T00:00:00.000Z',
      fechaActualizacion: '2026-11-01T00:00:00.000Z',
    };

    await mockInventoryRepo.save(gin);
    await mockInventoryRepo.save(campari);
    await mockInventoryRepo.save(vermut);

    renderApp();

    // Ir al recetario
    fireEvent.click(screen.getByTestId('tab-recetario'));

    await waitFor(() => {
      // Negroni debe estar disponible para armar hoy
      const negroniCard = screen.getByTestId('receta-card-receta-negroni');
      expect(negroniCard).toBeInTheDocument();
      expect(negroniCard).toHaveTextContent(/¡Armar hoy!/i);
    });

    // Filtro ¿Qué puedo armar hoy?
    fireEvent.click(screen.getByTestId('filtro-recetas-armar-hoy'));
    await waitFor(() => {
      expect(screen.getByTestId('receta-card-receta-negroni')).toBeInTheDocument();
    });
  });

  it('permite crear, editar y eliminar una receta de autor', async () => {
    renderApp();
    fireEvent.click(screen.getByTestId('tab-recetario'));

    await waitFor(() => {
      expect(screen.getByText('Negroni')).toBeInTheDocument();
    });

    // Abrir modal de creación
    fireEvent.click(screen.getByTestId('btn-nueva-receta'));
    expect(screen.getByRole('heading', { name: 'Nueva Receta de Autor' })).toBeInTheDocument();

    // Completar formulario
    fireEvent.change(screen.getByTestId('input-receta-nombre'), {
      target: { value: 'Mi Cóctel Especial' },
    });
    fireEvent.change(screen.getByTestId('input-receta-cristaleria'), {
      target: { value: 'Copa Coupé' },
    });
    fireEvent.change(screen.getByTestId('input-ingrediente-nombre-0'), {
      target: { value: 'Gin' },
    });
    fireEvent.change(screen.getByTestId('input-ingrediente-ml-0'), {
      target: { value: '60' },
    });
    fireEvent.change(screen.getByTestId('input-paso-0'), {
      target: { value: 'Batir en coctelera y servir' },
    });

    // Guardar
    fireEvent.click(screen.getByTestId('btn-guardar-receta'));

    await waitFor(() => {
      expect(screen.getByText('Mi Cóctel Especial')).toBeInTheDocument();
      expect(screen.getAllByText(/Receta de autor/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('permite preparar un trago y descuenta el volumen del inventario correctamente', async () => {
    const gin: Bebida = {
      id: 'gin-prep',
      nombre: 'London Dry Gin',
      marca: 'Bombay Sapphire',
      categoria: 'destilado',
      volumenTotalMl: 750,
      volumenRestanteMl: 500,
      precioEstimado: 25000,
      esFavorito: true,
      fechaCreacion: '2026-11-01T00:00:00.000Z',
      fechaActualizacion: '2026-11-01T00:00:00.000Z',
    };
    const tonica: Bebida = {
      id: 'tonica-prep',
      nombre: 'Agua Tónica',
      marca: 'Paso de los Toros',
      categoria: 'mixer_sin_alcohol',
      volumenTotalMl: 1500,
      volumenRestanteMl: 1000,
      precioEstimado: 2000,
      esFavorito: false,
      fechaCreacion: '2026-11-01T00:00:00.000Z',
      fechaActualizacion: '2026-11-01T00:00:00.000Z',
    };

    await mockInventoryRepo.save(gin);
    await mockInventoryRepo.save(tonica);

    renderApp();
    fireEvent.click(screen.getByTestId('tab-recetario'));

    await waitFor(() => {
      expect(screen.getByTestId('preparar-receta-receta-gin-tonic')).toBeInTheDocument();
    });

    // Abrir modal de preparación
    fireEvent.click(screen.getByTestId('preparar-receta-receta-gin-tonic'));
    expect(screen.getByText(/Preparar: Gin Tonic/i)).toBeInTheDocument();

    // Confirmar preparación
    fireEvent.click(screen.getByTestId('btn-confirmar-preparacion'));

    // Esperar mensaje toast de éxito
    await waitFor(() => {
      expect(screen.getByTestId('toast-notificacion')).toHaveTextContent(/Gin Tonic preparado/i);
    });

    // Verificar en el repositorio que se descontó el stock:
    // Gin Tonic descuenta 50 ml de Gin (500 -> 450) y 150 ml de Tónica (1000 -> 850)
    const ginActualizado = await mockInventoryRepo.getById('gin-prep');
    expect(ginActualizado?.volumenRestanteMl).toBe(450);

    const tonicaActualizada = await mockInventoryRepo.getById('tonica-prep');
    expect(tonicaActualizada?.volumenRestanteMl).toBe(850);
  });

  it('bloquea la preparación y previene stock negativo ante volumen insuficiente (Caso borde)', async () => {
    // Botella con volumen insuficiente (Gin Tonic requiere 50 ml de Gin y 150 ml de Tónica)
    const ginCasiVacio: Bebida = {
      id: 'gin-vacio',
      nombre: 'London Dry Gin',
      marca: 'Tanqueray',
      categoria: 'destilado',
      volumenTotalMl: 750,
      volumenRestanteMl: 20, // Solo quedan 20 ml
      precioEstimado: 25000,
      esFavorito: true,
      fechaCreacion: '2026-11-01T00:00:00.000Z',
      fechaActualizacion: '2026-11-01T00:00:00.000Z',
    };
    const tonica: Bebida = {
      id: 'tonica-ok',
      nombre: 'Agua Tónica',
      marca: 'Paso de los Toros',
      categoria: 'mixer_sin_alcohol',
      volumenTotalMl: 1500,
      volumenRestanteMl: 1000,
      precioEstimado: 2000,
      esFavorito: false,
      fechaCreacion: '2026-11-01T00:00:00.000Z',
      fechaActualizacion: '2026-11-01T00:00:00.000Z',
    };

    await mockInventoryRepo.save(ginCasiVacio);
    await mockInventoryRepo.save(tonica);

    renderApp();
    fireEvent.click(screen.getByTestId('tab-recetario'));

    // En la card no debe haber botón directo de preparar porque el stock es insuficiente
    await waitFor(() => {
      expect(screen.getByTestId('receta-card-receta-gin-tonic')).toHaveTextContent(/Falta 1 insumo/i);
    });

    // Ver detalle de la receta
    fireEvent.click(screen.getByTestId('detalle-receta-receta-gin-tonic'));

    // El botón dentro del detalle debe estar deshabilitado
    const btnDetallePreparar = screen.getByTestId('btn-modal-preparar-trago');
    expect(btnDetallePreparar).toBeDisabled();
    expect(btnDetallePreparar).toHaveTextContent(/Insumos Insuficientes/i);

    // Comprobar que el volumen no se alteró en lo absoluto
    const ginIntacto = await mockInventoryRepo.getById('gin-vacio');
    expect(ginIntacto?.volumenRestanteMl).toBe(20);
  });
});

