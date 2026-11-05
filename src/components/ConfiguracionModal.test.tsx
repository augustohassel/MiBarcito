import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfiguracionModal } from './ConfiguracionModal';
import { InventoryProvider } from '../context/InventoryContext';
import { InMemoryInventoryRepository } from '../infrastructure/storage/in-memory-inventory-repository';
import { InMemoryCategoriaRepository } from '../infrastructure/storage/in-memory-categoria-repository';
import { Bebida } from '../domain/models/bebida';

describe('ConfiguracionModal y CategoriasConfig', () => {
  const bebidasMock: Bebida[] = [
    {
      id: 'b-1',
      nombre: 'Gin Bombay',
      marca: 'Bombay Sapphire',
      categoria: 'destilado',
      volumenTotalMl: 750,
      volumenRestanteMl: 500,
      fechaCreacion: '2026-11-03T00:00:00Z',
      fechaActualizacion: '2026-11-03T00:00:00Z',
    },
    {
      id: 'b-2',
      nombre: 'Gin Tanqueray',
      marca: 'Tanqueray',
      categoria: 'destilado',
      volumenTotalMl: 750,
      volumenRestanteMl: 750,
      fechaCreacion: '2026-11-03T00:00:00Z',
      fechaActualizacion: '2026-11-03T00:00:00Z',
    },
  ];

  it('renderiza el modal cuando isOpen es true con el listado inicial de categorías', async () => {
    const handleClose = vi.fn();
    const invRepo = new InMemoryInventoryRepository(bebidasMock);
    const catRepo = new InMemoryCategoriaRepository();

    render(
      <InventoryProvider repository={invRepo} categoriaRepository={catRepo}>
        <ConfiguracionModal isOpen={true} onClose={handleClose} bebidas={bebidasMock} />
      </InventoryProvider>
    );

    expect(screen.getByText('Configuración del Bar')).toBeInTheDocument();
    expect(screen.getByText('Gestión de Categorías de Bebidas')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Destilado')).toBeInTheDocument();
      expect(screen.getByText('Aperitivo / Bitter')).toBeInTheDocument();
      expect(screen.getByText('Otro')).toBeInTheDocument();
      expect(screen.getByText('(2 botellas)')).toBeInTheDocument();
    });
  });

  it('permite crear una nueva categoría personalizada y la muestra en la lista', async () => {
    const invRepo = new InMemoryInventoryRepository();
    const catRepo = new InMemoryCategoriaRepository();

    render(
      <InventoryProvider repository={invRepo} categoriaRepository={catRepo}>
        <ConfiguracionModal isOpen={true} onClose={() => {}} bebidas={[]} />
      </InventoryProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Destilado')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('Nombre de nueva categoría');
    fireEvent.change(input, { target: { value: 'Mezcal Oaxaqueño' } });
    fireEvent.click(screen.getByRole('button', { name: /\+ Agregar/i }));

    await waitFor(() => {
      expect(screen.getByText('Mezcal Oaxaqueño')).toBeInTheDocument();
      expect(screen.getByText('Personalizada')).toBeInTheDocument();
    });
  });

  it('caso borde 3: rechaza nombres duplicados o vacíos con mensajes de validación', async () => {
    const invRepo = new InMemoryInventoryRepository();
    const catRepo = new InMemoryCategoriaRepository();

    render(
      <InventoryProvider repository={invRepo} categoriaRepository={catRepo}>
        <ConfiguracionModal isOpen={true} onClose={() => {}} bebidas={[]} />
      </InventoryProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Destilado')).toBeInTheDocument();
    });

    // Intentar nombre vacío
    const btnAgregar = screen.getByRole('button', { name: /\+ Agregar/i });
    fireEvent.click(btnAgregar);
    expect(screen.getByText('El nombre de la categoría es obligatorio')).toBeInTheDocument();

    // Intentar duplicado (case-insensitive)
    const input = screen.getByLabelText('Nombre de nueva categoría');
    fireEvent.change(input, { target: { value: '  destilado  ' } });
    fireEvent.click(btnAgregar);
    expect(screen.getByText('Ya existe una categoría con este nombre')).toBeInTheDocument();
  });

  it('permite renombrar una categoría existente', async () => {
    const invRepo = new InMemoryInventoryRepository();
    const catRepo = new InMemoryCategoriaRepository();

    render(
      <InventoryProvider repository={invRepo} categoriaRepository={catRepo}>
        <ConfiguracionModal isOpen={true} onClose={() => {}} bebidas={[]} />
      </InventoryProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Destilado')).toBeInTheDocument();
    });

    const btnsEditar = screen.getAllByTitle('Renombrar categoría');
    fireEvent.click(btnsEditar[0]);

    const inputEdicion = screen.getByLabelText('Editar nombre de categoría');
    fireEvent.change(inputEdicion, { target: { value: 'Destilados y Espirituosas' } });

    fireEvent.click(screen.getByTitle('Guardar nombre'));

    await waitFor(() => {
      expect(screen.getByText('Destilados y Espirituosas')).toBeInTheDocument();
    });
  });

  it('caso borde 2: bloquea permanentemente la eliminación del comodín Otro', async () => {
    const invRepo = new InMemoryInventoryRepository();
    const catRepo = new InMemoryCategoriaRepository();

    render(
      <InventoryProvider repository={invRepo} categoriaRepository={catRepo}>
        <ConfiguracionModal isOpen={true} onClose={() => {}} bebidas={[]} />
      </InventoryProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Otro')).toBeInTheDocument();
    });

    const btnEliminarOtro = screen.getByTitle(
      "La categoría 'Otro' es el comodín reservado del sistema y no puede eliminarse."
    );
    expect(btnEliminarOtro).toBeDisabled();
  });

  it('caso borde 1: bloquea la eliminación si la categoría tiene botellas asignadas', async () => {
    const invRepo = new InMemoryInventoryRepository(bebidasMock);
    const catRepo = new InMemoryCategoriaRepository();

    render(
      <InventoryProvider repository={invRepo} categoriaRepository={catRepo}>
        <ConfiguracionModal isOpen={true} onClose={() => {}} bebidas={bebidasMock} />
      </InventoryProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Destilado')).toBeInTheDocument();
    });

    // Destilado tiene 2 botellas asignadas
    const btnsEliminar = screen.getAllByTitle('Eliminar categoría');
    // Primer botón no deshabilitado corresponde a destilado
    fireEvent.click(btnsEliminar[0]);

    await waitFor(() => {
      expect(
        screen.getByText(/No se puede eliminar la categoría porque tiene 2 bebida\(s\) asignada\(s\)/i)
      ).toBeInTheDocument();
    });
  });

  it('permite eliminar una categoría no comodín sin botellas asociadas con confirmación', async () => {
    const invRepo = new InMemoryInventoryRepository();
    const catRepo = new InMemoryCategoriaRepository();

    render(
      <InventoryProvider repository={invRepo} categoriaRepository={catRepo}>
        <ConfiguracionModal isOpen={true} onClose={() => {}} bebidas={[]} />
      </InventoryProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Cerveza')).toBeInTheDocument();
    });

    // Agregar categoría personalizada sin uso
    const input = screen.getByLabelText('Nombre de nueva categoría');
    fireEvent.change(input, { target: { value: 'Sidra' } });
    fireEvent.click(screen.getByRole('button', { name: /\+ Agregar/i }));

    await waitFor(() => {
      expect(screen.getByText('Sidra')).toBeInTheDocument();
    });

    // Buscar y clickear eliminar en Sidra
    const btnsEliminar = screen.getAllByTitle('Eliminar categoría');
    const ultimoBtnEliminar = btnsEliminar[btnsEliminar.length - 1];
    fireEvent.click(ultimoBtnEliminar);

    // Diálogo de confirmación
    expect(screen.getByText('Eliminar Categoría')).toBeInTheDocument();
    expect(screen.getByText(/¿Estás seguro de que deseás eliminar la categoría "Sidra"\?/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));

    await waitFor(() => {
      expect(screen.queryByText('Sidra')).not.toBeInTheDocument();
    });
  });

  it('permite navegar a la solapa Inteligencia Artificial y configurar la API Key de Gemini', async () => {
    const invRepo = new InMemoryInventoryRepository();
    const catRepo = new InMemoryCategoriaRepository();

    render(
      <InventoryProvider repository={invRepo} categoriaRepository={catRepo}>
        <ConfiguracionModal isOpen={true} onClose={() => {}} bebidas={[]} initialTab="ia" />
      </InventoryProvider>
    );

    expect(screen.getByText('Google Gemini API')).toBeInTheDocument();
    expect(screen.getByText('Sin API Key configurada')).toBeInTheDocument();

    const inputKey = screen.getByLabelText('Gemini API Key');
    fireEvent.change(inputKey, { target: { value: 'AIzaSyTestApiKey123' } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar Configuración/i }));

    await waitFor(() => {
      expect(screen.getByText('Configuración de Gemini guardada con éxito.')).toBeInTheDocument();
      expect(screen.getByText(/IA Multimodal Activa/i)).toBeInTheDocument();
    });
  });

  describe('Gestión de Subcategorías (Issue #36)', () => {
    it('permite expandir subcategorías de una categoría, visualizar sus chips y agregar una nueva', async () => {
      const invRepo = new InMemoryInventoryRepository();
      const catRepo = new InMemoryCategoriaRepository();

      render(
        <InventoryProvider repository={invRepo} categoriaRepository={catRepo}>
          <ConfiguracionModal isOpen={true} onClose={() => {}} bebidas={[]} />
        </InventoryProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Destilado')).toBeInTheDocument();
      });

      // Expandir subcategorías de Destilado
      const btnExpandir = screen.getByLabelText('Administrar subcategorías de Destilado');
      fireEvent.click(btnExpandir);

      // Verificar chips iniciales
      expect(screen.getByText('Gin')).toBeInTheDocument();
      expect(screen.getByText('Vodka')).toBeInTheDocument();
      expect(screen.getByText('Ron')).toBeInTheDocument();

      // Agregar nueva subcategoría "Pisco Quebranta"
      const inputSubcat = screen.getByLabelText('Nueva subcategoría para Destilado');
      fireEvent.change(inputSubcat, { target: { value: 'Pisco Quebranta' } });

      const btnAgregarSubcat = screen.getByLabelText('Agregar subcategoría a Destilado');
      fireEvent.click(btnAgregarSubcat);

      await waitFor(() => {
        expect(screen.getByText('Pisco Quebranta')).toBeInTheDocument();
      });
    });

    it('permite eliminar una subcategoría existente', async () => {
      const invRepo = new InMemoryInventoryRepository();
      const catRepo = new InMemoryCategoriaRepository();

      render(
        <InventoryProvider repository={invRepo} categoriaRepository={catRepo}>
          <ConfiguracionModal isOpen={true} onClose={() => {}} bebidas={[]} />
        </InventoryProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Destilado')).toBeInTheDocument();
      });

      const btnExpandir = screen.getByLabelText('Administrar subcategorías de Destilado');
      fireEvent.click(btnExpandir);

      expect(screen.getByText('Vodka')).toBeInTheDocument();

      // Eliminar Vodka
      const btnEliminarVodka = screen.getByLabelText('Eliminar subcategoría Vodka');
      fireEvent.click(btnEliminarVodka);

      await waitFor(() => {
        expect(screen.queryByText('Vodka')).not.toBeInTheDocument();
      });
    });

    it('limpia en cascada la subcategoría en las bebidas afectadas de la despensa al eliminarla', async () => {
      const botellaConVodka: Bebida = {
        id: 'b-vodka-1',
        nombre: 'Vodka Smirnoff',
        marca: 'Smirnoff',
        categoria: 'destilado',
        subcategoria: 'Vodka',
        volumenTotalMl: 700,
        volumenRestanteMl: 700,
        fechaCreacion: '2026-11-04T00:00:00Z',
        fechaActualizacion: '2026-11-04T00:00:00Z',
      };
      const invRepo = new InMemoryInventoryRepository([botellaConVodka]);
      const catRepo = new InMemoryCategoriaRepository();
      const onActualizadas = vi.fn();

      render(
        <InventoryProvider repository={invRepo} categoriaRepository={catRepo}>
          <ConfiguracionModal
            isOpen={true}
            onClose={() => {}}
            bebidas={[botellaConVodka]}
            onBebidasActualizadas={onActualizadas}
          />
        </InventoryProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Destilado')).toBeInTheDocument();
      });

      const btnExpandir = screen.getByLabelText('Administrar subcategorías de Destilado');
      fireEvent.click(btnExpandir);

      expect(screen.getByText('Vodka')).toBeInTheDocument();

      const btnEliminarVodka = screen.getByLabelText('Eliminar subcategoría Vodka');
      fireEvent.click(btnEliminarVodka);

      await waitFor(async () => {
        expect(screen.queryByText('Vodka')).not.toBeInTheDocument();
        const guardada = await invRepo.getById('b-vodka-1');
        expect(guardada?.subcategoria).toBeUndefined();
        expect(onActualizadas).toHaveBeenCalled();
      });
    });

    it('caso borde: bloquea subcategorías duplicadas o vacías', async () => {
      const invRepo = new InMemoryInventoryRepository();
      const catRepo = new InMemoryCategoriaRepository();

      render(
        <InventoryProvider repository={invRepo} categoriaRepository={catRepo}>
          <ConfiguracionModal isOpen={true} onClose={() => {}} bebidas={[]} />
        </InventoryProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Destilado')).toBeInTheDocument();
      });

      const btnExpandir = screen.getByLabelText('Administrar subcategorías de Destilado');
      fireEvent.click(btnExpandir);

      // Intentar agregar "gin" duplicado
      const inputSubcat = screen.getByLabelText('Nueva subcategoría para Destilado');
      fireEvent.change(inputSubcat, { target: { value: '  GIN  ' } });

      const btnAgregarSubcat = screen.getByLabelText('Agregar subcategoría a Destilado');
      fireEvent.click(btnAgregarSubcat);

      await waitFor(() => {
        expect(
          screen.getByText('Ya existe esta subcategoría en la categoría')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Solapa Respaldo & Nube (Issue #41)', () => {
    it('muestra el conteo de botellas guardadas localmente en el dispositivo y los controles de backup JSON', async () => {
      const invRepo = new InMemoryInventoryRepository(bebidasMock);
      const catRepo = new InMemoryCategoriaRepository();

      render(
        <InventoryProvider repository={invRepo} categoriaRepository={catRepo}>
          <ConfiguracionModal
            isOpen={true}
            onClose={() => {}}
            bebidas={bebidasMock}
            initialTab="respaldo"
          />
        </InventoryProvider>
      );

      expect(
        screen.getByText('Sincronización en la Nube (Google Cloud Firestore)')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Datos Guardados en este Dispositivo (IndexedDB)')
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('local-bebidas-count')).toHaveTextContent('2');
      });

      expect(screen.getByTestId('btn-exportar-json')).toBeInTheDocument();
      expect(screen.getByTestId('btn-importar-json')).toBeInTheDocument();
      expect(screen.getByTestId('btn-migrar-datos-locales')).toBeDisabled();
    });
  });
});

