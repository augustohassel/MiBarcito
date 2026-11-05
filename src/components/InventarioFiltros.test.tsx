import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  InventarioFiltros,
  filtrarYOrdenarBebidas,
  FiltrosEstado,
} from './InventarioFiltros';
import { Bebida } from '../domain/models/bebida';

describe('InventarioFiltros Component y Lógica', () => {
  const listaBebidas: Bebida[] = [
    {
      id: '1',
      nombre: 'Gin Tanqueray',
      marca: 'Tanqueray',
      categoria: 'destilado',
      volumenTotalMl: 750,
      volumenRestanteMl: 300,
      precioEstimado: 22000,
      esFavorito: true,
      fechaCreacion: '2026-11-01T10:00:00Z',
      fechaActualizacion: '2026-11-01T10:00:00Z',
    },
    {
      id: '2',
      nombre: 'Aperol',
      marca: 'Campari Group',
      categoria: 'aperitivo_bitter',
      volumenTotalMl: 750,
      volumenRestanteMl: 700,
      precioEstimado: 12000,
      esFavorito: false,
      fechaCreacion: '2026-11-02T10:00:00Z',
      fechaActualizacion: '2026-11-02T10:00:00Z',
    },
    {
      id: '3',
      nombre: 'Vermut Rosso',
      marca: 'Carpano',
      categoria: 'aperitivo_bitter',
      volumenTotalMl: 1000,
      volumenRestanteMl: 100,
      precioEstimado: 9000,
      esFavorito: true,
      fechaCreacion: '2026-11-03T10:00:00Z',
      fechaActualizacion: '2026-11-03T10:00:00Z',
    },
    {
      id: '4',
      nombre: 'Whisky Archivada',
      marca: 'Old Brand',
      categoria: 'destilado',
      volumenTotalMl: 750,
      volumenRestanteMl: 0,
      precioEstimado: 30000,
      archivada: true,
      esFavorito: false,
      fechaCreacion: '2026-11-04T10:00:00Z',
      fechaActualizacion: '2026-11-04T10:00:00Z',
    },
  ];

  describe('filtrarYOrdenarBebidas (función pura)', () => {
    const filtrosBase: FiltrosEstado = {
      busqueda: '',
      categoria: 'todas',
      soloFavoritos: false,
      orden: 'nombre_asc',
    };

    it('filtra por búsqueda de texto tanto por nombre como por marca de forma insensible a mayúsculas', () => {
      const resNombre = filtrarYOrdenarBebidas(listaBebidas, {
        ...filtrosBase,
        busqueda: 'tanqueray',
      });
      expect(resNombre).toHaveLength(1);
      expect(resNombre[0].nombre).toBe('Gin Tanqueray');

      const resMarca = filtrarYOrdenarBebidas(listaBebidas, {
        ...filtrosBase,
        busqueda: 'campari',
      });
      expect(resMarca).toHaveLength(1);
      expect(resMarca[0].nombre).toBe('Aperol');
    });

    it('filtra por categoría seleccionada', () => {
      const resAperitivos = filtrarYOrdenarBebidas(listaBebidas, {
        ...filtrosBase,
        categoria: 'aperitivo_bitter',
      });
      expect(resAperitivos).toHaveLength(2);
      expect(resAperitivos.map((b) => b.nombre)).toEqual(['Aperol', 'Vermut Rosso']);
    });

    it('filtra solo favoritos cuando el flag está activo', () => {
      const resFav = filtrarYOrdenarBebidas(listaBebidas, {
        ...filtrosBase,
        soloFavoritos: true,
      });
      expect(resFav).toHaveLength(2);
      expect(resFav.every((b) => b.esFavorito)).toBe(true);
    });

    it('ordena por nombre ascendente y descendente', () => {
      const asc = filtrarYOrdenarBebidas(listaBebidas, {
        ...filtrosBase,
        orden: 'nombre_asc',
      });
      expect(asc.map((b) => b.nombre)).toEqual(['Aperol', 'Gin Tanqueray', 'Vermut Rosso']);

      const desc = filtrarYOrdenarBebidas(listaBebidas, {
        ...filtrosBase,
        orden: 'nombre_desc',
      });
      expect(desc.map((b) => b.nombre)).toEqual(['Vermut Rosso', 'Gin Tanqueray', 'Aperol']);
    });

    it('ordena por volumen restante ascendente y descendente', () => {
      const ascVol = filtrarYOrdenarBebidas(listaBebidas, {
        ...filtrosBase,
        orden: 'volumen_asc',
      });
      expect(ascVol.map((b) => b.volumenRestanteMl)).toEqual([100, 300, 700]);

      const descVol = filtrarYOrdenarBebidas(listaBebidas, {
        ...filtrosBase,
        orden: 'volumen_desc',
      });
      expect(descVol.map((b) => b.volumenRestanteMl)).toEqual([700, 300, 100]);
    });

    it('ordena por precio y por fecha', () => {
      const ascPrecio = filtrarYOrdenarBebidas(listaBebidas, {
        ...filtrosBase,
        orden: 'precio_asc',
      });
      expect(ascPrecio.map((b) => b.precioEstimado)).toEqual([9000, 12000, 22000]);

      const descFecha = filtrarYOrdenarBebidas(listaBebidas, {
        ...filtrosBase,
        orden: 'fecha_desc',
      });
      expect(descFecha.map((b) => b.id)).toEqual(['3', '2', '1']);
    });

    it('filtra por estadoBotella: solo activas por defecto, solo archivadas y todas (#53)', () => {
      // Activas por defecto (excluye id: '4' que está archivada)
      const resActivas = filtrarYOrdenarBebidas(listaBebidas, filtrosBase);
      expect(resActivas).toHaveLength(3);
      expect(resActivas.map((b) => b.id)).toEqual(['2', '1', '3']);

      // Solo archivadas
      const resArchivadas = filtrarYOrdenarBebidas(listaBebidas, {
        ...filtrosBase,
        estadoBotella: 'archivadas',
      });
      expect(resArchivadas).toHaveLength(1);
      expect(resArchivadas[0].nombre).toBe('Whisky Archivada');

      // Todas
      const resTodas = filtrarYOrdenarBebidas(listaBebidas, {
        ...filtrosBase,
        estadoBotella: 'todas',
      });
      expect(resTodas).toHaveLength(4);
    });
  });

  describe('InventarioFiltros UI', () => {
    const filtros: FiltrosEstado = {
      busqueda: 'gin',
      categoria: 'destilado',
      soloFavoritos: false,
      orden: 'nombre_asc',
    };

    it('dispara onChange al escribir en la búsqueda o cambiar categoría', () => {
      const onChange = vi.fn();
      render(
        <InventarioFiltros
          filtros={filtros}
          onChange={onChange}
          totalResultados={1}
          totalBebidas={3}
        />
      );

      const inputSearch = screen.getByPlaceholderText(/Buscar por nombre o marca/i);
      fireEvent.change(inputSearch, { target: { value: 'vodka' } });
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ busqueda: 'vodka' }));

      const pillTodas = screen.getByRole('button', { name: 'Todas' });
      fireEvent.click(pillTodas);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ categoria: 'todas' }));
    });

    it('permite alternar favoritos y restablecer filtros', () => {
      const onChange = vi.fn();
      render(
        <InventarioFiltros
          filtros={filtros}
          onChange={onChange}
          totalResultados={1}
          totalBebidas={3}
        />
      );

      const btnFav = screen.getByRole('button', { name: /Solo Favoritos/i });
      fireEvent.click(btnFav);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ soloFavoritos: true }));

      const btnRestablecer = screen.getByRole('button', { name: /Restablecer filtros/i });
      fireEvent.click(btnRestablecer);
      expect(onChange).toHaveBeenCalledWith({
        busqueda: '',
        categoria: 'todas',
        soloFavoritos: false,
        estadoBotella: 'activas',
        orden: 'nombre_asc',
      });
    });

    it('permite alternar el filtro de estado de botella (Activas, Archivadas, Todas)', () => {
      const onChange = vi.fn();
      render(
        <InventarioFiltros
          filtros={filtros}
          onChange={onChange}
          totalResultados={1}
          totalBebidas={3}
        />
      );

      const btnArchivadas = screen.getByRole('button', { name: 'Archivadas' });
      fireEvent.click(btnArchivadas);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ estadoBotella: 'archivadas' }));

      const btnTodas = screen.getByRole('button', { name: 'Todas las botellas' });
      fireEvent.click(btnTodas);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ estadoBotella: 'todas' }));
    });
  });
});

