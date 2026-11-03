import { useEffect, useMemo, useState } from 'react';
import { useInventoryRepository } from './context/InventoryContext';
import {
  Bebida,
  estaEnAlertaStockBajo,
} from './domain/models/bebida';
import { BebidaCard } from './components/BebidaCard';
import { BebidaFormModal, BebidaFormValues } from './components/BebidaFormModal';
import { ConfirmModal } from './components/ConfirmModal';
import {
  FiltrosEstado,
  filtrarYOrdenarBebidas,
  InventarioFiltros,
} from './components/InventarioFiltros';

const FILTROS_DEFAULT: FiltrosEstado = {
  busqueda: '',
  categoria: 'todas',
  soloFavoritos: false,
  orden: 'nombre_asc',
};

export function App() {
  const repository = useInventoryRepository();
  const [bebidas, setBebidas] = useState<Bebida[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Filtros y ordenamiento
  const [filtros, setFiltros] = useState<FiltrosEstado>(FILTROS_DEFAULT);

  // Estados de modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [bebidaAEditar, setBebidaAEditar] = useState<Bebida | null>(null);
  const [bebidaAEliminar, setBebidaAEliminar] = useState<Bebida | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadBebidas = async () => {
    try {
      setLoading(true);
      const data = await repository.getAll();
      setBebidas(data);
    } catch (err) {
      console.error('Error al cargar inventario:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBebidas();
  }, [repository]);

  // Lista procesada reactivamente con filtros y ordenamiento
  const bebidasFiltradas = useMemo(() => {
    return filtrarYOrdenarBebidas(bebidas, filtros);
  }, [bebidas, filtros]);

  // Handlers de CRUD
  const handleAbrirCrear = () => {
    setBebidaAEditar(null);
    setIsFormOpen(true);
  };

  const handleAbrirEditar = (bebida: Bebida) => {
    setBebidaAEditar(bebida);
    setIsFormOpen(true);
  };

  const handleGuardarBebida = async (datos: BebidaFormValues) => {
    const ahora = new Date().toISOString();

    if (datos.id) {
      // Edición de botella existente
      const original = bebidas.find((b) => b.id === datos.id);
      const actualizada: Bebida = {
        id: datos.id,
        nombre: datos.nombre.trim(),
        marca: datos.marca.trim(),
        categoria: datos.categoria,
        volumenTotalMl: datos.volumenTotalMl,
        volumenRestanteMl: datos.volumenRestanteMl,
        graduacionAlcoholica: datos.graduacionAlcoholica,
        precioEstimado: datos.precioEstimado,
        stockMinimoMl: datos.stockMinimoMl,
        esFavorito: datos.esFavorito,
        fechaCreacion: original?.fechaCreacion || ahora,
        fechaActualizacion: ahora,
      };
      await repository.save(actualizada);
    } else {
      // Alta de nueva botella
      const nueva: Bebida = {
        id: crypto.randomUUID(),
        nombre: datos.nombre.trim(),
        marca: datos.marca.trim(),
        categoria: datos.categoria,
        volumenTotalMl: datos.volumenTotalMl,
        volumenRestanteMl: datos.volumenRestanteMl,
        graduacionAlcoholica: datos.graduacionAlcoholica,
        precioEstimado: datos.precioEstimado,
        stockMinimoMl: datos.stockMinimoMl,
        esFavorito: datos.esFavorito,
        fechaCreacion: ahora,
        fechaActualizacion: ahora,
      };
      await repository.save(nueva);
    }

    await loadBebidas();
  };

  const handleSolicitarEliminar = (bebida: Bebida) => {
    setBebidaAEliminar(bebida);
  };

  const handleConfirmarEliminar = async () => {
    if (!bebidaAEliminar) return;
    try {
      await repository.delete(bebidaAEliminar.id);
      setBebidaAEliminar(null);
      await loadBebidas();
    } catch (err) {
      console.error('Error al eliminar bebida:', err);
    }
  };

  const handleToggleFavorito = async (bebida: Bebida) => {
    const actualizada: Bebida = {
      ...bebida,
      esFavorito: !bebida.esFavorito,
      fechaActualizacion: new Date().toISOString(),
    };
    await repository.save(actualizada);
    await loadBebidas();
  };

  const handleAjustarVolumen = async (bebida: Bebida, nuevoVolumenMl: number) => {
    const actualizada: Bebida = {
      ...bebida,
      volumenRestanteMl: nuevoVolumenMl,
      fechaActualizacion: new Date().toISOString(),
    };
    await repository.save(actualizada);
    await loadBebidas();
  };

  const handleAgregarMuestra = async () => {
    const nuevaBebida: Bebida = {
      id: crypto.randomUUID(),
      nombre: 'Gin London Dry',
      marca: 'Bombay Sapphire',
      categoria: 'destilado',
      volumenTotalMl: 750,
      volumenRestanteMl: 250,
      graduacionAlcoholica: 47,
      precioEstimado: 25000,
      stockMinimoMl: 300,
      esFavorito: true,
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
    };

    await repository.save(nuevaBebida);
    await loadBebidas();
  };

  const handleLimpiar = async () => {
    await repository.clear();
    await loadBebidas();
  };

  // Métricas
  const bajoStockCount = bebidas.filter(estaEnAlertaStockBajo).length;
  const favoritosCount = bebidas.filter((b) => b.esFavorito).length;
  const valorTotalEstimado = bebidas.reduce((acc, b) => acc + (b.precioEstimado || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10 px-4 py-3 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.svg"
              alt="Logo MiBarcito"
              className="w-9 h-9 rounded-xl shadow-md border border-slate-700/50"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
                MiBarcito
              </h1>
              <p className="text-xs text-slate-400">Gestión de Despensa & Coctelería</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOffline ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ● Modo Offline
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ● En línea
              </span>
            )}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
              PWA Ready
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto w-full px-4 py-6 sm:px-6 flex-1 flex flex-col gap-6">
        {/* Métricas rápidas del bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Total Bebidas
            </span>
            <p className="text-2xl font-bold text-sky-400 mt-1">{bebidas.length}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Favoritos
            </span>
            <p className="text-2xl font-bold text-amber-400 mt-1">{favoritosCount}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Alertas Stock Bajo
            </span>
            <p
              className={`text-2xl font-bold mt-1 ${
                bajoStockCount > 0 ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              {bajoStockCount}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Valor Estimado
            </span>
            <p className="text-lg sm:text-xl font-bold text-emerald-400 mt-1.5 truncate">
              ${valorTotalEstimado.toLocaleString('es-AR')}
            </p>
          </div>
        </div>

        {/* Barra de Filtros, Búsqueda y Ordenamiento */}
        <InventarioFiltros
          filtros={filtros}
          onChange={setFiltros}
          totalResultados={bebidasFiltradas.length}
          totalBebidas={bebidas.length}
        />

        {/* Acciones principales de inventario */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-200">
            Despensa ({bebidasFiltradas.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleAbrirCrear}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl transition-colors shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Nueva Bebida</span>
            </button>
            <button
              onClick={handleAgregarMuestra}
              className="px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700 cursor-pointer"
            >
              + Botella de Prueba
            </button>
            {bebidas.length > 0 && (
              <button
                onClick={handleLimpiar}
                className="px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 rounded-xl transition-colors border border-slate-800 cursor-pointer"
              >
                Limpiar Despensa
              </button>
            )}
          </div>
        </div>

        {/* Grid de Bebidas o Estados Vacíos */}
        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            Cargando inventario local...
          </div>
        ) : bebidas.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <span className="text-4xl">🍸</span>
            <p className="text-base font-medium text-slate-300">Tu bar está vacío por ahora.</p>
            <p className="text-xs text-slate-500 max-w-sm">
              Hacé clic en "Nueva Bebida" para registrar tus botellas manualmente o en "+ Botella de Prueba" para verificar la despensa.
            </p>
            <button
              onClick={handleAbrirCrear}
              className="mt-2 px-4 py-2 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl shadow cursor-pointer transition-colors"
            >
              + Registrar Primer Botella
            </button>
          </div>
        ) : bebidasFiltradas.length === 0 ? (
          <div className="border border-slate-800 rounded-2xl p-10 text-center text-slate-400 flex flex-col items-center gap-3 bg-slate-900/40">
            <span className="text-3xl">🔍</span>
            <p className="text-sm font-medium text-slate-300">
              No se encontraron botellas con los filtros actuales.
            </p>
            <button
              onClick={() => setFiltros(FILTROS_DEFAULT)}
              className="px-3 py-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 border border-sky-500/30 rounded-xl cursor-pointer"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bebidasFiltradas.map((item) => (
              <BebidaCard
                key={item.id}
                bebida={item}
                onEditar={handleAbrirEditar}
                onEliminar={handleSolicitarEliminar}
                onToggleFavorito={handleToggleFavorito}
                onAjustarVolumen={handleAjustarVolumen}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modales */}
      <BebidaFormModal
        isOpen={isFormOpen}
        bebidaAEditar={bebidaAEditar}
        onSave={handleGuardarBebida}
        onClose={() => setIsFormOpen(false)}
      />

      <ConfirmModal
        isOpen={Boolean(bebidaAEliminar)}
        titulo="Eliminar Bebida"
        mensaje={`¿Estás seguro de que deseás eliminar "${bebidaAEliminar?.nombre}" (${bebidaAEliminar?.marca}) de tu despensa? Esta acción no se puede deshacer.`}
        textoConfirmar="Sí, eliminar"
        textoCancelar="Cancelar"
        variante="peligro"
        onConfirm={handleConfirmarEliminar}
        onCancel={() => setBebidaAEliminar(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-4 py-4 text-center text-xs text-slate-500">
        MiBarcito • Gestión de Despensa & Coctelería • ADR-001
      </footer>
    </div>
  );
}
export default App;
