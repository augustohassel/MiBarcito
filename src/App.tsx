import { useEffect, useState } from 'react';
import { useInventoryRepository } from './context/InventoryContext';
import { Bebida, estaEnAlertaStockBajo } from './domain/models/bebida';

export function App() {
  const repository = useInventoryRepository();
  const [bebidas, setBebidas] = useState<Bebida[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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

  const bajoStockCount = bebidas.filter(estaEnAlertaStockBajo).length;

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
      <main className="max-w-5xl mx-auto w-full px-4 py-6 sm:px-6 flex-1">
        {/* Banner de bienvenida y estado base */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 mb-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-2">
            Arquitectura Base y PWA Instalable
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Plataforma lista con soporte offline, almacenamiento local desacoplado
            mediante IndexedDB y diseño preparado para portabilidad futura hacia APIs en GCP.
          </p>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Total Bebidas
            </span>
            <p className="text-2xl font-bold text-sky-400 mt-1">{bebidas.length}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Alertas Stock Bajo
            </span>
            <p className={`text-2xl font-bold mt-1 ${bajoStockCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {bajoStockCount}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Persistencia
            </span>
            <p className="text-sm font-semibold text-emerald-400 mt-2">
              IndexedDB (Local-First)
            </p>
          </div>
        </div>

        {/* Acciones de prueba rápida de inventario */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-base font-semibold text-slate-200">
            Inventario en Despensa ({bebidas.length})
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleAgregarMuestra}
              className="px-3.5 py-1.5 text-xs font-medium bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg transition-colors shadow"
            >
              + Agregar Botella de Prueba
            </button>
            {bebidas.length > 0 && (
              <button
                onClick={handleLimpiar}
                className="px-3.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
              >
                Limpiar Despensa
              </button>
            )}
          </div>
        </div>

        {/* Listado de inventario */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Cargando inventario local...
          </div>
        ) : bebidas.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-400">
            <p className="text-sm">Tu bar está vacío por ahora.</p>
            <p className="text-xs text-slate-500 mt-1">
              Hacé clic en "+ Agregar Botella de Prueba" para verificar la persistencia offline.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bebidas.map((item) => {
              const enAlerta = estaEnAlertaStockBajo(item);
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-start"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-white">{item.nombre}</h4>
                    <p className="text-xs text-slate-400">
                      {item.marca} • <span className="capitalize">{item.categoria}</span>
                    </p>
                    <div className="mt-2 text-xs text-slate-300">
                      <span>Restante: {item.volumenRestanteMl} ml / {item.volumenTotalMl} ml</span>
                    </div>
                  </div>
                  {enAlerta && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Stock Bajo
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-4 py-4 text-center text-xs text-slate-500">
        MiBarcito • Setup Base & Arquitectura • ADR-001
      </footer>
    </div>
  );
}
export default App;

