import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { InventoryProvider } from './context/InventoryContext';
import { InMemoryInventoryRepository } from './infrastructure/storage/in-memory-inventory-repository';
import { InMemoryCategoriaRepository } from './infrastructure/storage/in-memory-categoria-repository';

describe('App Component - Gestión de Despensa e Inventario', () => {
  let mockRepo: InMemoryInventoryRepository;
  let mockCatRepo: InMemoryCategoriaRepository;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    mockRepo = new InMemoryInventoryRepository();
    mockCatRepo = new InMemoryCategoriaRepository();
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

  it('permite alternar entre Modo Claro y Modo Oscuro mediante el botón de la cabecera', async () => {
    render(
      <InventoryProvider repository={mockRepo}>
        <App />
      </InventoryProvider>
    );

    // Inicia en modo claro por defecto
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    const btnTema = screen.getByRole('button', { name: /Cambiar a modo oscuro/i });
    expect(btnTema).toBeInTheDocument();

    // Alternar a modo oscuro
    act(() => {
      fireEvent.click(btnTema);
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(screen.getByRole('button', { name: /Cambiar a modo claro/i })).toBeInTheDocument();

    // Alternar nuevamente a modo claro
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Cambiar a modo claro/i }));
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(screen.getByRole('button', { name: /Cambiar a modo oscuro/i })).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText(/^Categoría/i), {
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

  it('permite abrir la ficha técnica en modo lectura desde la tarjeta de la botella', async () => {
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

    // Abrir Ficha Técnica
    const btnFicha = screen.getByRole('button', { name: /^Ver ficha técnica/i });
    fireEvent.click(btnFicha);

    // Debe abrir en modo lectura
    expect(screen.getByText('Ficha Técnica')).toBeInTheDocument();
    expect(screen.getByText('Modo Lectura')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Editar Bebida/i })).toBeInTheDocument();

    // Pasar a edición
    fireEvent.click(screen.getByRole('button', { name: /Editar Bebida/i }));
    expect(screen.getByText('Editar Bebida')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar Cambios/i })).toBeInTheDocument();

    // Cerrar modal
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    await waitFor(() => {
      expect(screen.queryByText('Editar Bebida')).not.toBeInTheDocument();
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

  it('permite abrir el modal de configuración desde el botón del Header y gestionar categorías', async () => {
    render(
      <InventoryProvider repository={mockRepo} categoriaRepository={mockCatRepo}>
        <App />
      </InventoryProvider>
    );

    // Botón de configuración en el Header
    const btnConfig = screen.getByRole('button', { name: /Abrir Configuración/i });
    expect(btnConfig).toBeInTheDocument();
    fireEvent.click(btnConfig);

    // Modal abierto
    expect(screen.getByText('Configuración del Bar')).toBeInTheDocument();
    expect(screen.getByText('Gestión de Categorías de Bebidas')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Destilado')).toBeInTheDocument();
    });

    // Crear nueva categoría "Tequila Añejo"
    const inputCat = screen.getByLabelText('Nombre de nueva categoría');
    fireEvent.change(inputCat, { target: { value: 'Tequila Añejo' } });
    fireEvent.click(screen.getByRole('button', { name: /\+ Agregar/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Tequila Añejo').length).toBeGreaterThanOrEqual(1);
    });

    // Cerrar configuración
    fireEvent.click(screen.getByLabelText('Cerrar configuración'));

    // Verificar que la nueva categoría aparece reactivamente en las píldoras de filtro
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Tequila Añejo' })).toBeInTheDocument();
    });
  });

  it('permite abrir el modal de valoración financiera y visualizar métricas y desglose', async () => {
    // Sembrar dos bebidas: una con precio y otra sin precio
    await mockRepo.save({
      id: 'b-1',
      nombre: 'Gin Tanqueray',
      marca: 'Tanqueray',
      categoria: 'destilado',
      volumenTotalMl: 750,
      volumenRestanteMl: 750,
      precioEstimado: 12000,
      stockMinimoMl: 200,
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
    });

    await mockRepo.save({
      id: 'b-2',
      nombre: 'Vino Malbec',
      marca: 'Catena Zapata',
      categoria: 'vino',
      volumenTotalMl: 750,
      volumenRestanteMl: 750,
      precioEstimado: undefined,
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
    });

    render(
      <InventoryProvider repository={mockRepo} categoriaRepository={mockCatRepo}>
        <App />
      </InventoryProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Gin Tanqueray')).toBeInTheDocument();
    });

    // Clic en la tarjeta de valor estimado
    const cardValor = screen.getByTestId('card-valor-estimado');
    expect(cardValor).toBeInTheDocument();
    expect(screen.getByText(/1 sin cotizar/i)).toBeInTheDocument();

    fireEvent.click(cardValor);

    // Modal de Valoración abierto
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText('Valoración del Bar')).toBeInTheDocument();
    expect(within(modal).getByTestId('aviso-botellas-sin-precio')).toHaveTextContent(/1 botella sin precio estimado/i);
    expect(within(modal).getByText('Destilado')).toBeInTheDocument();
    expect(within(modal).getByText(/100%/i)).toBeInTheDocument();

    // Cerrar modal
    fireEvent.click(within(modal).getByLabelText('Cerrar modal de métricas'));
    await waitFor(() => {
      expect(screen.queryByText('Valoración del Bar')).toBeNull();
    });
  });

  it('permite abrir el panel de alertas de stock y reponer volumen rápidamente', async () => {
    // Sembrar bebida en nivel crítico (restan 100 ml y el umbral es 250 ml)
    await mockRepo.save({
      id: 'b-critica',
      nombre: 'Vermut Rosso',
      marca: 'Carpano',
      categoria: 'aperitivo_bitter',
      volumenTotalMl: 1000,
      volumenRestanteMl: 100,
      stockMinimoMl: 250,
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
    });

    render(
      <InventoryProvider repository={mockRepo} categoriaRepository={mockCatRepo}>
        <App />
      </InventoryProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Vermut Rosso')).toBeInTheDocument();
    });

    // Clic en la tarjeta de alertas de stock
    const cardAlertas = screen.getByTestId('card-alertas-stock');
    expect(cardAlertas).toBeInTheDocument();
    expect(screen.getByText('Crítico')).toBeInTheDocument();

    fireEvent.click(cardAlertas);

    // Modal de Alertas abierto
    expect(screen.getByText('Alertas de Stock Bajo')).toBeInTheDocument();
    expect(screen.getByText(/Restan 100 ml/i)).toBeInTheDocument();
    expect(screen.getByText(/Umbral: 250 ml/i)).toBeInTheDocument();
    expect(screen.getByText(/Faltan/i)).toBeInTheDocument();
    expect(screen.getByText(/150 ml/i)).toBeInTheDocument();

    // Acción rápida: Botella Llena (1000 ml)
    const btnLlenar = screen.getByText(/Botella Llena \(1000 ml\)/i);
    fireEvent.click(btnLlenar);

    // Cerrar modal de alertas
    fireEvent.click(screen.getByLabelText('Cerrar modal de alertas'));

    // Esperar a que se actualice la despensa con 1000 ml
    await waitFor(() => {
      expect(screen.getByText('1000 / 1000 ml (100%)')).toBeInTheDocument();
    });
  });
});
