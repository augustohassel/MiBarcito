import { useEffect, useMemo, useState } from 'react';
import { useInventoryRepository } from './context/InventoryContext';
import { useTheme } from './hooks/useTheme';
import {
  Bebida,
  estaEnAlertaStockBajo,
} from './domain/models/bebida';
import { BebidaCard } from './components/BebidaCard';
import { BebidaFormModal, BebidaFormValues } from './components/BebidaFormModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ConfiguracionModal } from './components/ConfiguracionModal';
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
  const { theme, toggleTheme } = useTheme();
  const [bebidas, setBebidas] = useState<Bebida[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Filtros y ordenamiento
  const [filtros, setFiltros] = useState<FiltrosEstado>(FILTROS_DEFAULT);

  // Estados de modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
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
    const id = datos.id ?? crypto.randomUUID();
    const original = datos.id ? bebidas.find((b) => b.id === datos.id) : undefined;
    const fechaCreacion = original?.fechaCreacion || ahora;

    const bebidaAGuardar: Bebida = {
      ...datos,
      id,
      nombre: datos.nombre.trim(),
      marca: datos.marca.trim(),
      fechaCreacion,
      fechaActualizacion: ahora,
    };

    await repository.save(bebidaAGuardar);
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
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-sans transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-outline bg-surface-container/90 backdrop-blur sticky top-0 z-10 px-4 py-3 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.svg"
              alt="Logo MiBarcito"
              className="w-9 h-9 rounded-xl shadow-xs border border-outline"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-primary">
                MiBarcito
              </h1>
              <p className="text-xs text-on-surface-variant">Gestión de Despensa & Coctelería</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOffline ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-amber/15 text-status-amber border border-status-amber/30">
                ● Modo Offline
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-emerald/15 text-status-emerald border border-status-emerald/30">
                ● En línea
              </span>
            )}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-container text-on-primary-container border border-outline-variant">
              PWA Ready
            </span>

            {/* Botón de Alternancia Claro / Oscuro */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer shadow-xs"
            >
              <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
              <span className="hidden sm:inline">
                {theme === 'dark' ? 'Claro' : 'Oscuro'}
              </span>
            </button>

            <button
              onClick={() => setIsConfigOpen(true)}
              aria-label="Abrir Configuración"
              title="Configuración de Parámetros y Categorías"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer shadow-xs ml-0.5"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Configuración</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto w-full px-4 py-6 sm:px-6 flex-1 flex flex-col gap-6">
        {/* Métricas rápidas del bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl bg-surface-container border border-outline shadow-xs">
            <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
              Total Bebidas
            </span>
            <p className="text-2xl font-bold text-primary mt-1">{bebidas.length}</p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container border border-outline shadow-xs">
            <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
              Favoritos
            </span>
            <p className="text-2xl font-bold text-status-amber mt-1">{favoritosCount}</p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container border border-outline shadow-xs">
            <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
              Alertas Stock Bajo
            </span>
            <p
              className={`text-2xl font-bold mt-1 ${
                bajoStockCount > 0 ? 'text-status-amber' : 'text-on-surface-variant'
              }`}
            >
              {bajoStockCount}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container border border-outline shadow-xs">
            <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
              Valor Estimado
            </span>
            <p className="text-lg sm:text-xl font-bold text-status-emerald mt-1.5 truncate">
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
          <h2 className="text-base font-semibold text-on-surface">
            Despensa ({bebidasFiltradas.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleAbrirCrear}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Nueva Bebida</span>
            </button>
            <button
              onClick={handleAgregarMuestra}
              className="px-3 py-2 text-xs font-medium bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl transition-colors border border-outline cursor-pointer"
            >
              + Botella de Prueba
            </button>
            {bebidas.length > 0 && (
              <button
                onClick={handleLimpiar}
                className="px-3 py-2 text-xs font-medium bg-surface-container hover:bg-status-rose/10 text-on-surface-variant hover:text-status-rose rounded-xl transition-colors border border-outline cursor-pointer"
              >
                Limpiar Despensa
              </button>
            )}
          </div>
        </div>

        {/* Grid de Bebidas o Estados Vacíos */}
        {loading ? (
          <div className="text-center py-16 text-on-surface-variant text-sm">
            Cargando inventario local...
          </div>
        ) : bebidas.length === 0 ? (
          <div className="border border-dashed border-outline rounded-2xl p-12 text-center text-on-surface-variant flex flex-col items-center gap-3 bg-surface-container/40">
            <span className="text-4xl">🍸</span>
            <p className="text-base font-medium text-on-surface">Tu bar está vacío por ahora.</p>
            <p className="text-xs text-on-surface-variant max-w-sm">
              Hacé clic en "Nueva Bebida" para registrar tus botellas manualmente o en "+ Botella de Prueba" para verificar la despensa.
            </p>
            <button
              onClick={handleAbrirCrear}
              className="mt-2 px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              + Registrar Primer Botella
            </button>
          </div>
        ) : bebidasFiltradas.length === 0 ? (
          <div className="border border-outline rounded-2xl p-10 text-center text-on-surface-variant flex flex-col items-center gap-3 bg-surface-container/60">
            <span className="text-3xl">🔍</span>
            <p className="text-sm font-medium text-on-surface">
              No se encontraron botellas con los filtros actuales.
            </p>
            <button
              onClick={() => setFiltros(FILTROS_DEFAULT)}
              className="px-3 py-1.5 text-xs font-medium text-primary hover:text-primary-hover border border-outline rounded-xl cursor-pointer bg-surface-container"
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

      <ConfiguracionModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        bebidas={bebidas}
      />

      {/* Footer */}
      <footer className="border-t border-outline px-4 py-4 text-center text-xs text-on-surface-variant">
        MiBarcito • Gestión de Despensa & Coctelería • Google Material 3
      </footer>
    </div>
  );
}
export default App;
