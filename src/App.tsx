import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useAlmacen,
  useCategoriasOpcional,
  useCloudSync,
  useInventoryRepository,
  useRecetas,
} from './context/InventoryContext';
import { useAuth } from './context/AuthContext';
import { useTheme } from './hooks/useTheme';
import {
  Bebida,
} from './domain/models/bebida';
import { Receta, clonarRecetaParaAutor } from './domain/models/receta';
import { clasificarRecetas, normalizarTexto } from './domain/services/recetario-motor';
import {
  calcularMetricasValoracion,
  obtenerBebidasEnAlertaStock,
} from './domain/services/metricas-bar';
import { BebidaCard } from './components/BebidaCard';
import { BebidaFormModal, BebidaFormValues } from './components/BebidaFormModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ConfiguracionModal, TabConfig } from './components/ConfiguracionModal';
import { MetricasValoracionModal } from './components/MetricasValoracionModal';
import { AlertasStockModal } from './components/AlertasStockModal';
import { hasGeminiApiKey } from './infrastructure/ai/ai-config';
import {
  FiltrosEstado,
  filtrarYOrdenarBebidas,
  InventarioFiltros,
} from './components/InventarioFiltros';
import { RecetaCard } from './components/RecetaCard';
import { RecetarioFiltros, FiltroSeccionRecetario } from './components/RecetarioFiltros';
import { RecetaFormModal } from './components/RecetaFormModal';
import { RecetaDetalleModal } from './components/RecetaDetalleModal';
import { PrepararTragoModal } from './components/PrepararTragoModal';
import { AlmacenView } from './components/AlmacenView';

const FILTROS_DEFAULT: FiltrosEstado = {
  busqueda: '',
  categoria: 'todas',
  soloFavoritos: false,
  estadoBotella: 'activas',
  orden: 'nombre_asc',
};

export function App() {
  const repository = useInventoryRepository();
  const categoriasCtx = useCategoriasOpcional();
  const {
    recetas,
    loadingRecetas,
    guardarReceta,
    eliminarReceta,
    toggleFavoritoReceta,
    prepararTrago,
  } = useRecetas();

  const {
    insumos,
    guardarInsumo,
    eliminarInsumo,
    toggleDisponibleInsumo,
  } = useAlmacen();

  const { theme, toggleTheme } = useTheme();
  const { user, firebaseEnabled, signInWithGoogle } = useAuth();
  const { isCloudActive, syncingCloud } = useCloudSync();
  const [bebidas, setBebidas] = useState<Bebida[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Navegación principal de solapas
  const [tabActiva, setTabActiva] = useState<'despensa' | 'almacen' | 'recetario'>('despensa');

  // Filtros de Despensa
  const [filtros, setFiltros] = useState<FiltrosEstado>(FILTROS_DEFAULT);

  // Filtros de Recetario
  const [busquedaReceta, setBusquedaReceta] = useState('');
  const [filtroSeccionReceta, setFiltroSeccionReceta] = useState<FiltroSeccionRecetario>('todas');

  // Estados de Modales de Despensa
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [modoLecturaModal, setModoLecturaModal] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configTab, setConfigTab] = useState<TabConfig>('categorias');
  const [isMetricasOpen, setIsMetricasOpen] = useState(false);
  const [isAlertasOpen, setIsAlertasOpen] = useState(false);
  const [fotoPendienteParaModal, setFotoPendienteParaModal] = useState<File | null>(null);
  const fileInputFotoRef = useRef<HTMLInputElement>(null);
  const [bebidaAEditar, setBebidaAEditar] = useState<Bebida | null>(null);
  const [bebidaAEliminar, setBebidaAEliminar] = useState<Bebida | null>(null);

  // Estados de Modales de Recetario
  const [isRecetaFormOpen, setIsRecetaFormOpen] = useState(false);
  const [recetaAEditar, setRecetaAEditar] = useState<Receta | null>(null);
  const [recetaAEliminar, setRecetaAEliminar] = useState<Receta | null>(null);
  const [recetaDetalle, setRecetaDetalle] = useState<Receta | null>(null);
  const [recetaAPreparar, setRecetaAPreparar] = useState<Receta | null>(null);

  // Toast de notificación
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);

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

  // Mensaje toast con autodescarte
  useEffect(() => {
    if (!toastMensaje) return;
    const timer = setTimeout(() => {
      setToastMensaje(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toastMensaje]);

  // Lista procesada reactivamente con filtros y ordenamiento de Despensa
  const bebidasFiltradas = useMemo(() => {
    return filtrarYOrdenarBebidas(bebidas, filtros);
  }, [bebidas, filtros]);

  // Clasificación algorítmica del Recetario en tiempo real (cruzando Despensa y Almacén)
  const clasificacionRecetas = useMemo(() => {
    return clasificarRecetas(recetas, bebidas, insumos);
  }, [recetas, bebidas, insumos]);

  // Filtrado de recetas en Recetario
  const recetasFiltradasEvaluadas = useMemo(() => {
    return clasificacionRecetas.todas.filter((item) => {
      // Filtro por búsqueda de texto (nombre de receta o nombre de ingredientes)
      if (busquedaReceta.trim().length > 0) {
        const busqNorm = normalizarTexto(busquedaReceta);
        const coincideNombre = normalizarTexto(item.receta.nombre).includes(busqNorm);
        const coincideIngrediente = item.receta.ingredientes.some((ing) =>
          normalizarTexto(ing.nombre).includes(busqNorm)
        );
        if (!coincideNombre && !coincideIngrediente) {
          return false;
        }
      }

      // Filtro por sección o categoría
      if (filtroSeccionReceta === 'armar_hoy') {
        return item.seccion === 'armar_hoy';
      }
      if (filtroSeccionReceta === 'casi_listos') {
        return item.seccion === 'casi_listos';
      }
      if (filtroSeccionReceta === 'favoritas') {
        return item.receta.esFavorito;
      }
      if (filtroSeccionReceta === 'propias') {
        return item.receta.esPropia;
      }

      return true;
    });
  }, [clasificacionRecetas, busquedaReceta, filtroSeccionReceta]);

  // Handlers de CRUD de Bebidas
  const handleAbrirConfiguracion = (tab: TabConfig = 'categorias') => {
    setConfigTab(tab);
    setIsConfigOpen(true);
  };

  const handleAbrirCrear = () => {
    setModoLecturaModal(false);
    setBebidaAEditar(null);
    setFotoPendienteParaModal(null);
    setIsFormOpen(true);
  };

  const handleAbrirCargarConFoto = () => {
    if (!hasGeminiApiKey()) {
      handleAbrirConfiguracion('ia');
      return;
    }
    fileInputFotoRef.current?.click();
  };

  const handleFotoSeleccionada = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setModoLecturaModal(false);
      setBebidaAEditar(null);
      setFotoPendienteParaModal(files[0]);
      setIsFormOpen(true);
    }
    e.target.value = '';
  };

  const handleAbrirEditar = (bebida: Bebida) => {
    setModoLecturaModal(false);
    setBebidaAEditar(bebida);
    setFotoPendienteParaModal(null);
    setIsFormOpen(true);
  };

  const handleAbrirFicha = (bebida: Bebida) => {
    setModoLecturaModal(true);
    setBebidaAEditar(bebida);
    setFotoPendienteParaModal(null);
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

  const handleToggleArchivar = async (bebida: Bebida) => {
    const actualizada: Bebida = {
      ...bebida,
      archivada: !bebida.archivada,
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

  // Handlers de Recetas
  const handleAbrirCrearReceta = () => {
    setRecetaAEditar(null);
    setIsRecetaFormOpen(true);
  };

  const handleAbrirEditarReceta = (receta: Receta) => {
    setRecetaAEditar(receta);
    setIsRecetaFormOpen(true);
  };

  const handleGuardarReceta = async (recetaData: Receta) => {
    await guardarReceta(recetaData);
    setToastMensaje(
      recetaAEditar
        ? `Receta "${recetaData.nombre}" actualizada.`
        : `¡Receta "${recetaData.nombre}" creada con éxito!`
    );
  };

  const handleSolicitarEliminarReceta = (receta: Receta) => {
    setRecetaAEliminar(receta);
  };

  const handleConfirmarEliminarReceta = async () => {
    if (!recetaAEliminar) return;
    const res = await eliminarReceta(recetaAEliminar.id);
    if (res.ok) {
      setToastMensaje(`Receta "${recetaAEliminar.nombre}" eliminada.`);
      setRecetaAEliminar(null);
    } else {
      alert(res.motivo || 'No se pudo eliminar la receta');
    }
  };

  const handleDuplicarReceta = async (receta: Receta) => {
    const clon = clonarRecetaParaAutor(receta);
    await guardarReceta(clon);
    setToastMensaje(`Receta copiada a tus recetas de autor: "${clon.nombre}"`);
  };

  const handleConfirmarPreparacionTrago = async (
    receta: Receta,
    descuentos: { botellaId: string; cantidadMl: number }[]
  ): Promise<{ ok: boolean; motivo?: string }> => {
    const res = await prepararTrago(receta, descuentos);
    if (res.ok) {
      await loadBebidas();
      setToastMensaje(`🍸 ¡${receta.nombre} preparado! Se descontó el volumen de tu despensa.`);
      setRecetaAPreparar(null);
    }
    return res;
  };

  // Métricas y Alertas (Issue #7)
  const metricasValoracion = useMemo(() => {
    return calcularMetricasValoracion(bebidas, categoriasCtx?.categorias);
  }, [bebidas, categoriasCtx?.categorias]);

  const alertasStock = useMemo(() => {
    return obtenerBebidasEnAlertaStock(bebidas);
  }, [bebidas]);

  const bajoStockCount = alertasStock.length;
  const favoritosCount = useMemo(() => bebidas.filter((b) => b.esFavorito).length, [bebidas]);
  const valorTotalEstimado = metricasValoracion.costoTotal;

  // Evaluación para modal de detalle
  const evaluacionRecetaDetalle = useMemo(() => {
    if (!recetaDetalle) return null;
    return clasificacionRecetas.todas.find((e) => e.receta.id === recetaDetalle.id) || null;
  }, [recetaDetalle, clasificacionRecetas]);

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-sans transition-colors duration-200">
      {/* Toast Notification */}
      {toastMensaje && (
        <div
          data-testid="toast-notificacion"
          className="fixed bottom-5 right-5 z-50 bg-on-surface text-surface px-4 py-3 rounded-2xl shadow-lg border border-outline flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 text-xs font-medium"
        >
          <span>{toastMensaje}</span>
          <button
            type="button"
            onClick={() => setToastMensaje(null)}
            className="opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Principal */}
      <header className="border-b border-outline bg-surface-container/90 backdrop-blur sticky top-0 z-10 px-4 py-3 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}pwa-192x192.svg`}
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
            {isOffline && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-amber/15 text-status-amber border border-status-amber/30">
                ● Modo Offline
              </span>
            )}

            {/* Estado / Botón de Sesión Cloud */}
            {firebaseEnabled && (
              user ? (
                <button
                  type="button"
                  onClick={() => handleAbrirConfiguracion('respaldo')}
                  data-testid="header-user-button"
                  title={`Conectado como ${user.email || user.displayName || 'Usuario'} (${
                    syncingCloud ? 'Sincronizando...' : isCloudActive ? 'Nube activa' : 'Modo local'
                  })`}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer shadow-xs"
                >
                  <span>{syncingCloud ? '⏳' : '☁️'}</span>
                  <span className="hidden sm:inline max-w-28 truncate">
                    {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Mi Cuenta'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await signInWithGoogle();
                    if (ok) {
                      setToastMensaje(
                        '☁️ Sesión iniciada con Google. Sincronizando tus botellas locales a la nube...'
                      );
                    } else {
                      handleAbrirConfiguracion('respaldo');
                    }
                  }}
                  data-testid="header-login-button"
                  title="Iniciar sesión con Google y respaldar tus botellas en la nube"
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary border border-outline transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
                >
                  <span>☁️</span>
                  <span className="hidden sm:inline">Conectar Google</span>
                </button>
              )
            )}

            {/* Alternancia Claro / Oscuro */}
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
              onClick={() => handleAbrirConfiguracion('categorias')}
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

      {/* Selector de Solapas Principal (Despensa | Almacén | Recetario) */}
      <nav aria-label="Navegación principal" className="border-b border-outline bg-surface-container px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center gap-1 pt-2 overflow-x-auto" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tabActiva === 'despensa'}
            onClick={() => setTabActiva('despensa')}
            data-testid="tab-despensa"
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              tabActiva === 'despensa'
                ? 'border-primary text-primary bg-surface/50'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span>🍾 Despensa & Stock</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-surface-container-high border border-outline">
              {bebidas.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tabActiva === 'almacen'}
            onClick={() => setTabActiva('almacen')}
            data-testid="tab-almacen"
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              tabActiva === 'almacen'
                ? 'border-primary text-primary bg-surface/50'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span>🍋 Almacén</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-surface-container-high border border-outline">
              {insumos.filter((i) => i.disponible).length}/{insumos.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tabActiva === 'recetario'}
            onClick={() => setTabActiva('recetario')}
            data-testid="tab-recetario"
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              tabActiva === 'recetario'
                ? 'border-primary text-primary bg-surface/50'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span>🍸 Recetario Dinámico</span>
            {clasificacionRecetas.totalArmables > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-status-emerald text-white font-bold">
                {clasificacionRecetas.totalArmables} armables
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto w-full px-4 py-6 sm:px-6 flex-1 flex flex-col gap-6">
        {/* ================= VISTA DE DESPENSA ================= */}
        {tabActiva === 'despensa' && (
          <>
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

              <button
                type="button"
                onClick={() => setIsAlertasOpen(true)}
                data-testid="card-alertas-stock"
                className={`p-4 rounded-xl text-left bg-surface-container border shadow-xs transition-all duration-150 cursor-pointer group flex flex-col justify-between ${
                  bajoStockCount > 0
                    ? 'border-status-amber/60 hover:border-status-amber hover:bg-status-amber/10'
                    : 'border-outline hover:border-primary/40 hover:bg-surface-container-high'
                }`}
                title="Ver alertas de stock bajo"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                    Alertas Stock
                  </span>
                  <span className="text-[10px] font-semibold text-primary group-hover:underline">
                    Ver ↗
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <p
                    className={`text-2xl font-bold ${
                      bajoStockCount > 0 ? 'text-status-amber' : 'text-on-surface-variant'
                    }`}
                  >
                    {bajoStockCount}
                  </p>
                  {bajoStockCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-status-amber/20 text-status-amber border border-status-amber/30">
                      Crítico
                    </span>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsMetricasOpen(true)}
                data-testid="card-valor-estimado"
                className="p-4 rounded-xl text-left bg-surface-container border border-outline hover:border-primary/40 hover:bg-surface-container-high shadow-xs transition-all duration-150 cursor-pointer group flex flex-col justify-between"
                title="Ver desglose financiero del bar"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                    Valor Estimado
                  </span>
                  <span className="text-[10px] font-semibold text-primary group-hover:underline">
                    Detalle ↗
                  </span>
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-bold text-status-emerald mt-1.5 truncate">
                    ${valorTotalEstimado.toLocaleString('es-AR')}
                  </p>
                  {metricasValoracion.botellasSinPrecio > 0 && (
                    <span className="text-[10px] text-status-amber block truncate mt-0.5">
                      {metricasValoracion.botellasSinPrecio} sin cotizar
                    </span>
                  )}
                </div>
              </button>
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
              <div className="flex flex-wrap gap-2">
                <input
                  type="file"
                  ref={fileInputFotoRef}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFotoSeleccionada}
                  aria-label="Capturar o subir foto para despensa"
                />
                <button
                  onClick={handleAbrirCrear}
                  className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>+</span>
                  <span>Nueva Bebida</span>
                </button>
                <button
                  onClick={handleAbrirCargarConFoto}
                  className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-secondary/15 hover:bg-secondary/25 text-secondary border border-secondary/30 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                  title="Reconocer etiqueta y autocompletar con IA Gemini"
                >
                  <span>📸</span>
                  <span>Cargar con Foto</span>
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
                    onVerFicha={handleAbrirFicha}
                    onEliminar={handleSolicitarEliminar}
                    onToggleFavorito={handleToggleFavorito}
                    onAjustarVolumen={handleAjustarVolumen}
                    onToggleArchivar={handleToggleArchivar}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ================= VISTA DE ALMACÉN ================= */}
        {tabActiva === 'almacen' && (
          <AlmacenView
            insumos={insumos}
            onToggleDisponible={toggleDisponibleInsumo}
            onGuardarInsumo={guardarInsumo}
            onEliminarInsumo={eliminarInsumo}
          />
        )}

        {/* ================= VISTA DE RECETARIO DINÁMICO ================= */}
        {tabActiva === 'recetario' && (
          <>
            {/* Métricas rápidas de recetas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-xl bg-surface-container border border-outline shadow-xs">
                <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                  Total Recetas
                </span>
                <p className="text-2xl font-bold text-primary mt-1">{recetas.length}</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container border border-status-emerald/40 shadow-xs bg-status-emerald/5">
                <span className="text-xs font-medium text-status-emerald uppercase tracking-wider">
                  🍸 Armables Hoy
                </span>
                <p className="text-2xl font-bold text-status-emerald mt-1">
                  {clasificacionRecetas.armarHoy.length}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container border border-status-amber/40 shadow-xs bg-status-amber/5">
                <span className="text-xs font-medium text-status-amber uppercase tracking-wider">
                  ⏳ Casi Listos
                </span>
                <p className="text-2xl font-bold text-status-amber mt-1">
                  {clasificacionRecetas.casiListos.length}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container border border-outline shadow-xs">
                <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                  Mis Recetas Propias
                </span>
                <p className="text-2xl font-bold text-on-surface mt-1">
                  {recetas.filter((r) => r.esPropia).length}
                </p>
              </div>
            </div>

            {/* Barra de Filtros del Recetario */}
            <RecetarioFiltros
              busqueda={busquedaReceta}
              onBusquedaChange={setBusquedaReceta}
              filtroActivo={filtroSeccionReceta}
              onFiltroChange={setFiltroSeccionReceta}
              conteoArmables={clasificacionRecetas.armarHoy.length}
              conteoCasiListos={clasificacionRecetas.casiListos.length}
              conteoTotal={recetas.length}
            />

            {/* Acciones del Recetario */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <h2 className="text-base font-semibold text-on-surface">
                {filtroSeccionReceta === 'armar_hoy'
                  ? '🍸 ¿Qué puedo armar hoy? (100% disponibles)'
                  : filtroSeccionReceta === 'casi_listos'
                  ? '⏳ Casi listos (Faltan 1 o 2 insumos)'
                  : filtroSeccionReceta === 'favoritas'
                  ? '⭐ Recetas Favoritas'
                  : filtroSeccionReceta === 'propias'
                  ? '✨ Mis Recetas de Autor'
                  : 'Catálogo de Cócteles'} ({recetasFiltradasEvaluadas.length})
              </h2>

              <button
                type="button"
                onClick={handleAbrirCrearReceta}
                data-testid="btn-nueva-receta"
                className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>+</span>
                <span>Nueva Receta de Autor</span>
              </button>
            </div>

            {/* Listado de Recetas */}
            {loadingRecetas ? (
              <div className="text-center py-16 text-on-surface-variant text-sm">
                Cargando recetario y evaluando existencias del bar...
              </div>
            ) : recetasFiltradasEvaluadas.length === 0 ? (
              <div className="border border-outline rounded-2xl p-10 text-center text-on-surface-variant flex flex-col items-center gap-3 bg-surface-container/60">
                <span className="text-3xl">🍸</span>
                <p className="text-sm font-medium text-on-surface">
                  No se encontraron recetas con los filtros actuales.
                </p>
                {filtroSeccionReceta === 'armar_hoy' && bebidas.length === 0 && (
                  <p className="text-xs text-on-surface-variant max-w-sm">
                    Actualmente tu despensa está vacía. Añadí botellas en la pestaña "Despensa" para ver qué cócteles podés armar.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setBusquedaReceta('');
                    setFiltroSeccionReceta('todas');
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-primary hover:text-primary-hover border border-outline rounded-xl cursor-pointer bg-surface-container"
                >
                  Ver todas las recetas
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recetasFiltradasEvaluadas.map((evalItem) => (
                  <RecetaCard
                    key={evalItem.receta.id}
                    evaluacion={evalItem}
                    onVerDetalle={(r) => setRecetaDetalle(r)}
                    onPreparar={(r) => setRecetaAPreparar(r)}
                    onToggleFavorito={toggleFavoritoReceta}
                    onEditar={handleAbrirEditarReceta}
                    onEliminar={handleSolicitarEliminarReceta}
                    onDuplicar={handleDuplicarReceta}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modales de Despensa */}
      <BebidaFormModal
        isOpen={isFormOpen}
        bebidaAEditar={bebidaAEditar}
        modoInicialLectura={modoLecturaModal}
        fotoInicial={fotoPendienteParaModal}
        onSave={handleGuardarBebida}
        onClose={() => {
          setIsFormOpen(false);
          setFotoPendienteParaModal(null);
          setModoLecturaModal(false);
        }}
        onAbrirConfiguracionIa={() => handleAbrirConfiguracion('ia')}
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
        initialTab={configTab}
        onBebidasActualizadas={loadBebidas}
      />

      <MetricasValoracionModal
        isOpen={isMetricasOpen}
        onClose={() => setIsMetricasOpen(false)}
        metricas={metricasValoracion}
      />

      <AlertasStockModal
        isOpen={isAlertasOpen}
        onClose={() => setIsAlertasOpen(false)}
        alertas={alertasStock}
        onEditarBebida={handleAbrirEditar}
        onAjustarVolumen={handleAjustarVolumen}
        costoReposicion={metricasValoracion.costoReposicion}
        botellasReposicionSinPrecio={metricasValoracion.botellasReposicionSinPrecio}
      />

      {/* Modales de Recetario */}
      <RecetaFormModal
        isOpen={isRecetaFormOpen}
        onClose={() => setIsRecetaFormOpen(false)}
        onSave={handleGuardarReceta}
        recetaAEditar={recetaAEditar}
      />

      <RecetaDetalleModal
        isOpen={Boolean(recetaDetalle)}
        receta={recetaDetalle}
        evaluacion={evaluacionRecetaDetalle}
        onClose={() => setRecetaDetalle(null)}
        onPreparar={(r) => {
          setRecetaDetalle(null);
          setRecetaAPreparar(r);
        }}
        onToggleFavorito={toggleFavoritoReceta}
        onEditar={handleAbrirEditarReceta}
        onDuplicar={handleDuplicarReceta}
      />

      <PrepararTragoModal
        isOpen={Boolean(recetaAPreparar)}
        receta={recetaAPreparar}
        bebidasEnDespensa={bebidas}
        onClose={() => setRecetaAPreparar(null)}
        onConfirmarPreparacion={handleConfirmarPreparacionTrago}
      />

      <ConfirmModal
        isOpen={Boolean(recetaAEliminar)}
        titulo="Eliminar Receta de Autor"
        mensaje={`¿Estás seguro de que deseás eliminar la receta "${recetaAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        textoConfirmar="Sí, eliminar"
        textoCancelar="Cancelar"
        variante="peligro"
        onConfirm={handleConfirmarEliminarReceta}
        onCancel={() => setRecetaAEliminar(null)}
      />

      {/* Footer */}
      <footer className="border-t border-outline px-4 py-4 text-center text-xs text-on-surface-variant">
        MiBarcito v{__APP_VERSION__} • Gestión de Despensa & Coctelería • Google Material 3
      </footer>
    </div>
  );
}

export default App;
