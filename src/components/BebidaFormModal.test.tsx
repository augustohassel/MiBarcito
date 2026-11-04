import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BebidaFormModal } from './BebidaFormModal';
import { Bebida } from '../domain/models/bebida';
import * as geminiService from '../domain/services/gemini-botella.service';
import * as aiConfig from '../infrastructure/ai/ai-config';

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

  describe('Carga Asistida por IA Multimodal (Issue #6)', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('alerta amigablemente si el usuario intenta autocompletar sin API Key configurada', async () => {
      vi.spyOn(aiConfig, 'hasGeminiApiKey').mockReturnValue(false);
      const onAbrirConfig = vi.fn();

      render(
        <BebidaFormModal
          isOpen={true}
          onSave={vi.fn()}
          onClose={vi.fn()}
          onAbrirConfiguracionIa={onAbrirConfig}
        />
      );

      const fileInput = screen.getByLabelText(/Cargar foto de botella/i);
      const fakeFile = new File(['image-data'], 'botella.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [fakeFile] } });

      await waitFor(() => {
        expect(
          screen.getByText(/Para el reconocimiento automático con IA, es necesario configurar una Gemini API Key/i)
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Configurar API Key ahora/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Configurar API Key ahora/i }));
      expect(onAbrirConfig).toHaveBeenCalled();
    });

    it('autocompleta los campos desde la foto y permite revisión humana antes de guardar', async () => {
      vi.spyOn(aiConfig, 'hasGeminiApiKey').mockReturnValue(true);
      vi.spyOn(geminiService, 'analizarFotoBotella').mockResolvedValue({
        exito: true,
        datos: {
          nombre: 'Tanqueray London Dry Gin',
          marca: 'Tanqueray',
          categoriaSugerida: 'Destilado',
          graduacionAlcoholica: 47.3,
          precioEstimado: 28000,
          volumenTotalMl: 750,
        },
        fuentePrecios: 'Google Search',
      });

      const onSave = vi.fn();
      render(<BebidaFormModal isOpen={true} onSave={onSave} onClose={vi.fn()} />);

      const fileInput = screen.getByLabelText(/Cargar foto de botella/i);
      const fakeFile = new File(['image-data'], 'tanqueray.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [fakeFile] } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Tanqueray London Dry Gin')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Tanqueray')).toBeInTheDocument();
        expect(screen.getByDisplayValue('47.3')).toBeInTheDocument();
        expect(screen.getByDisplayValue('28000')).toBeInTheDocument();
        expect(screen.getByText(/¡Botella reconocida con éxito!/i)).toBeInTheDocument();
        expect(screen.getByText(/precio de mercado sugerido vía Google Search/i)).toBeInTheDocument();
      });

      // Verificación humana: el usuario corrige el nombre y el precio antes de guardar
      const inputNombre = screen.getByLabelText(/Nombre de la Bebida/i);
      fireEvent.change(inputNombre, { target: { value: 'Tanqueray Rangpur' } });

      const inputPrecio = screen.getByLabelText(/Precio Est/i);
      fireEvent.change(inputPrecio, { target: { value: '31000' } });

      fireEvent.click(screen.getByRole('button', { name: /Crear Bebida/i }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            nombre: 'Tanqueray Rangpur',
            marca: 'Tanqueray',
            graduacionAlcoholica: 47.3,
            precioEstimado: 31000,
            volumenTotalMl: 750,
          })
        );
      });
    });

    it('caso de falla / borde: ante foto borrosa o ilegible no bloquea la interfaz y mantiene la miniatura para carga manual', async () => {
      vi.spyOn(aiConfig, 'hasGeminiApiKey').mockReturnValue(true);
      vi.spyOn(geminiService, 'analizarFotoBotella').mockResolvedValue({
        exito: false,
        error: 'No pudimos reconocer la etiqueta con claridad en la fotografía.',
        codigoError: 'IMAGEN_ILEGIBLE',
      });

      const onSave = vi.fn();
      render(<BebidaFormModal isOpen={true} onSave={onSave} onClose={vi.fn()} />);

      const fileInput = screen.getByLabelText(/Cargar foto de botella/i);
      const fakeFile = new File(['image-data'], 'borrosa.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [fakeFile] } });

      await waitFor(() => {
        // Muestra la foto de referencia
        expect(screen.getByAltText('Foto de la botella tomada')).toBeInTheDocument();
        // Muestra el mensaje no bloqueante
        expect(
          screen.getByText('No pudimos reconocer la etiqueta con claridad en la fotografía.')
        ).toBeInTheDocument();
      });

      // El usuario puede transcribir manualmente los datos usando la foto como referencia
      fireEvent.change(screen.getByLabelText(/Nombre de la Bebida/i), {
        target: { value: 'Whisky Jameson' },
      });
      fireEvent.change(screen.getByLabelText(/Marca \/ Destilería/i), {
        target: { value: 'Jameson' },
      });
      fireEvent.change(screen.getByLabelText(/Capacidad Total/i), {
        target: { value: '1000' },
      });
      fireEvent.change(screen.getByLabelText(/Volumen Restante/i), {
        target: { value: '1000' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Crear Bebida/i }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            nombre: 'Whisky Jameson',
            marca: 'Jameson',
            volumenTotalMl: 1000,
            volumenRestanteMl: 1000,
          })
        );
      });
    });
  });
});
