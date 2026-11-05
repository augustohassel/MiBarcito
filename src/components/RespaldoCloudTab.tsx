import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCloudSync } from '../context/InventoryContext';
import {
  LocalStorageSummary,
  MiBarcitoBackupPayload,
} from '../infrastructure/storage/cloud-migration.service';

export interface RespaldoCloudTabProps {
  onInventarioActualizado?: () => Promise<void> | void;
}

export const RespaldoCloudTab: React.FC<RespaldoCloudTabProps> = ({
  onInventarioActualizado,
}) => {
  const {
    user,
    loadingAuth,
    firebaseEnabled,
    authError,
    signInWithGoogle,
    signOut,
    clearAuthError,
  } = useAuth();

  const {
    isCloudActive,
    syncingCloud,
    lastMigrationResult,
    cloudSyncError,
    clearCloudSyncError,
    sincronizarDatosLocalesANube,
    obtenerResumenLocalDispositivo,
    exportarRespaldoJson,
    importarRespaldoJson,
  } = useCloudSync();

  const [localSummary, setLocalSummary] = useState<LocalStorageSummary | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cargarResumenLocal = async () => {
    try {
      const resumen = await obtenerResumenLocalDispositivo();
      setLocalSummary(resumen);
    } catch (err) {
      console.error('Error al inspeccionar datos locales:', err);
    }
  };

  useEffect(() => {
    cargarResumenLocal();
  }, []);

  const handleLoginGoogle = async () => {
    setStatusMessage(null);
    setLocalError(null);
    const ok = await signInWithGoogle();
    if (ok) {
      await cargarResumenLocal();
      await onInventarioActualizado?.();
    }
  };

  const handleLogout = async () => {
    setStatusMessage(null);
    setLocalError(null);
    await signOut();
    setStatusMessage('Sesión cerrada. Ahora estás operando sobre el almacenamiento local de este dispositivo.');
    await cargarResumenLocal();
    await onInventarioActualizado?.();
  };

  const handleSincronizarManual = async () => {
    setStatusMessage(null);
    setLocalError(null);
    const res = await sincronizarDatosLocalesANube();
    if (res) {
      setStatusMessage(
        `☁️ Fusión completada: ${res.bebidasSubidas} botella(s), ${res.recetasSubidas} receta(s), ${res.categoriasSubidas} categoría(s) y ${res.insumosSubidos} insumo(s) sincronizados desde este dispositivo hacia tu cuenta.`
      );
      await cargarResumenLocal();
      await onInventarioActualizado?.();
    }
  };

  const handleExportarJson = async () => {
    try {
      setLocalError(null);
      const payload = await exportarRespaldoJson();
      const jsonString = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fecha = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `mibarcito-respaldo-${fecha}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusMessage(
        `📥 Respaldo JSON descargado (${payload.bebidas.length} botella(s) y ${payload.recetas.length} receta(s)).`
      );
    } catch (err) {
      setLocalError('No se pudo generar el archivo de respaldo JSON.');
      console.error(err);
    }
  };

  const handleSeleccionarArchivoImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      setLocalError(null);
      setStatusMessage(null);
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<MiBarcitoBackupPayload>;
      const res = await importarRespaldoJson(parsed);
      await cargarResumenLocal();
      await onInventarioActualizado?.();
      setStatusMessage(
        `📤 Respaldo importado con éxito: ${res.bebidasImportadas} botella(s), ${res.recetasImportadas} receta(s) y ${res.insumosImportados} insumo(s) restaurados.`
      );
    } catch (err: any) {
      setLocalError(err?.message || 'El archivo seleccionado no es un respaldo JSON válido de MiBarcito.');
    }
  };

  const errorMostrado = authError || cloudSyncError || localError;

  return (
    <div className="flex flex-col gap-4 text-xs sm:text-sm" data-testid="respaldo-cloud-tab">
      {/* Mensajes de estado o error */}
      {errorMostrado && (
        <div
          role="alert"
          data-testid="cloud-error-alert"
          className="p-3 rounded-xl bg-status-rose/10 border border-status-rose/30 text-status-rose text-xs flex items-start justify-between gap-2"
        >
          <span>⚠️ {errorMostrado}</span>
          <button
            type="button"
            onClick={() => {
              clearAuthError();
              clearCloudSyncError();
              setLocalError(null);
            }}
            className="text-status-rose font-bold hover:opacity-80 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {statusMessage && !errorMostrado && (
        <div
          role="status"
          data-testid="cloud-status-message"
          className="p-3 rounded-xl bg-status-emerald/10 border border-status-emerald/30 text-status-emerald text-xs"
        >
          {statusMessage}
        </div>
      )}

      {/* Tarjeta 1: Cuenta de Google y Sincronización Cloud */}
      <div className="p-4 rounded-xl bg-surface border border-outline flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-bold text-on-surface text-sm flex items-center gap-1.5">
              <span>☁️</span>
              <span>Sincronización en la Nube (Google Cloud Firestore)</span>
            </h4>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Iniciá sesión con tu cuenta de Google para respaldar tus botellas y sincronizarlas entre tu celular y tu PC sin perder tus datos locales.
            </p>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap border ${
              isCloudActive
                ? 'bg-status-emerald/15 text-status-emerald border-status-emerald/30'
                : 'bg-surface-container-high text-on-surface-variant border-outline'
            }`}
          >
            {isCloudActive ? 'Nube Activa' : 'Modo Local'}
          </span>
        </div>

        {!firebaseEnabled ? (
          <div className="p-3 rounded-xl bg-surface-container-high/60 border border-outline text-xs text-on-surface-variant">
            ℹ️ Las variables <code className="font-mono text-on-surface">VITE_FIREBASE_*</code> no están definidas en este entorno. MiBarcito está operando 100% sobre <code className="font-mono text-on-surface">IndexedDB</code> local.
          </div>
        ) : loadingAuth ? (
          <div className="text-xs text-on-surface-variant py-2">
            Verificando estado de sesión con Google...
          </div>
        ) : user ? (
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container border border-outline">
              <div className="flex items-center gap-2.5 min-w-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="w-8 h-8 rounded-full border border-outline"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-on-surface text-xs truncate">
                    {user.displayName || 'Usuario Autenticado'}
                  </p>
                  <p className="text-[11px] text-on-surface-variant truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                data-testid="btn-logout-google"
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-surface hover:bg-status-rose/10 text-on-surface-variant hover:text-status-rose border border-outline transition-colors cursor-pointer whitespace-nowrap"
              >
                Cerrar sesión
              </button>
            </div>

            {lastMigrationResult && isCloudActive && (
              <p className="text-[11px] text-status-emerald font-medium">
                ✅ Cuenta conectada y sincronizada ({lastMigrationResult.bebidasSubidas} botella(s) y{' '}
                {lastMigrationResult.recetasSubidas} receta(s) fusionadas con la nube).
              </p>
            )}
          </div>
        ) : (
          <div className="pt-1">
            <button
              type="button"
              onClick={handleLoginGoogle}
              data-testid="btn-login-google"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-semibold text-xs sm:text-sm transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🔐</span>
              <span>Iniciar sesión con Google</span>
            </button>
          </div>
        )}
      </div>

      {/* Tarjeta 2: Migración Segura de las Botellas del Dispositivo (IndexedDB -> Cuenta) */}
      <div className="p-4 rounded-xl bg-surface border border-outline flex flex-col gap-3">
        <div>
          <h4 className="font-bold text-on-surface text-sm flex items-center gap-1.5">
            <span>📱</span>
            <span>Datos Guardados en este Dispositivo (IndexedDB)</span>
          </h4>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Tus botellas cargadas previamente en el navegador nunca se borran al iniciar sesión. Al conectarte con Google se fusionan automáticamente hacia tu cuenta, y también podés forzar la subida manual cuando quieras:
          </p>
        </div>

        {localSummary && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-surface-container border border-outline">
              <span className="text-[11px] text-on-surface-variant block">Botellas locales</span>
              <span className="text-base font-bold text-primary" data-testid="local-bebidas-count">
                {localSummary.bebidasCount}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-container border border-outline">
              <span className="text-[11px] text-on-surface-variant block">Recetas propias</span>
              <span className="text-base font-bold text-on-surface">
                {localSummary.recetasPropiasCount}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-container border border-outline">
              <span className="text-[11px] text-on-surface-variant block">Categorías extra</span>
              <span className="text-base font-bold text-on-surface">
                {localSummary.categoriasCustomCount}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!user || syncingCloud}
            onClick={handleSincronizarManual}
            data-testid="btn-migrar-datos-locales"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary/15 hover:bg-secondary/25 text-secondary border border-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>☁️</span>
            <span>
              {syncingCloud
                ? 'Sincronizando con Firestore...'
                : 'Migrar / Subir datos de este dispositivo a mi cuenta'}
            </span>
          </button>
          {!user && (
            <span className="text-[11px] text-on-surface-variant">
              (Iniciá sesión con Google arriba para habilitar la subida a la nube)
            </span>
          )}
        </div>
      </div>

      {/* Tarjeta 3: Exportación e Importación Manual JSON */}
      <div className="p-4 rounded-xl bg-surface border border-outline flex flex-col gap-3">
        <div>
          <h4 className="font-bold text-on-surface text-sm flex items-center gap-1.5">
            <span>💾</span>
            <span>Copia de Seguridad en Archivo (JSON)</span>
          </h4>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Descargá una copia completa de tus botellas, categorías, recetas e insumos en tu celular o PC, o restaurá un archivo guardado previamente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportarJson}
            data-testid="btn-exportar-json"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>📥</span>
            <span>Descargar backup JSON</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleSeleccionarArchivoImportar}
            className="hidden"
            aria-label="Seleccionar archivo JSON de respaldo"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            data-testid="btn-importar-json"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>📤</span>
            <span>Importar backup JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};

