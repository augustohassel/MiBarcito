import React, { useState, useEffect } from 'react';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  removeGeminiApiKey,
  hasGeminiApiKey,
  getGeminiModel,
  setGeminiModel,
  MODELOS_DISPONIBLES_GEMINI,
} from '../infrastructure/ai/ai-config';

export const AiConfigTab: React.FC = () => {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(getGeminiModel());
  const [isConfigured, setIsConfigured] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: 'success' | 'info';
  } | null>(null);

  useEffect(() => {
    const currentKey = getGeminiApiKey();
    setKeyInput(currentKey);
    setSelectedModel(getGeminiModel());
    setIsConfigured(hasGeminiApiKey());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiModel(selectedModel);

    if (!keyInput.trim()) {
      removeGeminiApiKey();
      setIsConfigured(false);
      setFeedbackMessage({ text: 'Clave eliminada correctamente.', type: 'info' });
      return;
    }

    setGeminiApiKey(keyInput);
    setIsConfigured(true);
    setFeedbackMessage({ text: 'Configuración de Gemini guardada con éxito.', type: 'success' });
  };

  const handleRemove = () => {
    removeGeminiApiKey();
    setKeyInput('');
    setIsConfigured(false);
    setFeedbackMessage({ text: 'Clave eliminada correctamente.', type: 'info' });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150 py-1">
      <div>
        <h4 className="text-sm font-semibold text-on-surface flex items-center gap-2">
          <span>✨</span>
          <span>Google Gemini API</span>
        </h4>
        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
          Permite el reconocimiento visual de etiquetas de botellas mediante visión artificial y la
          búsqueda web de precios estimados de mercado en tiempo real.
        </p>
      </div>

      {/* Estado actual */}
      <div
        className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
          isConfigured
            ? 'bg-secondary/10 border-secondary text-secondary'
            : 'bg-surface-container-high border-outline text-on-surface-variant'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{isConfigured ? '🟢' : '⚪'}</span>
          <span>
            {isConfigured
              ? `IA Multimodal Activa (${selectedModel})`
              : 'Sin API Key configurada'}
          </span>
        </div>
        {isConfigured && (
          <span className="text-[11px] bg-secondary/20 px-2 py-0.5 rounded-full font-semibold">
            Listo para escanear
          </span>
        )}
      </div>

      {/* Formulario */}
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label
            htmlFor="gemini-api-key-input"
            className="block text-xs font-medium text-on-surface mb-1"
          >
            Gemini API Key
          </label>
          <div className="relative">
            <input
              id="gemini-api-key-input"
              type={showKey ? 'text' : 'password'}
              placeholder="AIzaSy..."
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                setFeedbackMessage(null);
              }}
              className="w-full bg-surface-container-high border border-outline rounded-xl px-3.5 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary pr-20"
              autoComplete="off"
              spellCheck="false"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-on-surface-variant hover:text-on-surface px-1.5 py-0.5 rounded bg-surface-container border border-outline cursor-pointer"
            >
              {showKey ? 'Ocultar' : 'Ver'}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="gemini-model-select"
            className="block text-xs font-medium text-on-surface mb-1"
          >
            Modelo de Gemini
          </label>
          <select
            id="gemini-model-select"
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              setFeedbackMessage(null);
            }}
            className="w-full bg-surface-container-high border border-outline rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
          >
            {MODELOS_DISPONIBLES_GEMINI.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-on-surface-variant/80 mt-1">
            Si un modelo arroja 404 por versión de API, el sistema reintenta automáticamente con los demás modelos candidatos.
          </p>
        </div>

        {feedbackMessage && (
          <p
            className={`text-xs font-medium ${
              feedbackMessage.type === 'success' ? 'text-secondary' : 'text-on-surface-variant'
            }`}
          >
            {feedbackMessage.text}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
          >
            <span>💾</span>
            <span>Guardar Configuración</span>
          </button>
          {isConfigured && (
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-2 bg-error/10 text-error border border-error/20 rounded-xl text-xs font-semibold hover:bg-error/20 transition-colors cursor-pointer"
            >
              Eliminar
            </button>
          )}
        </div>
      </form>

      {/* Privacidad y ayuda */}
      <div className="bg-surface-container p-3.5 rounded-xl border border-outline/70 space-y-2 text-xs text-on-surface-variant">
        <div className="flex items-center gap-1.5 font-semibold text-on-surface">
          <span>🔒</span>
          <span>Privacidad y Seguridad Garantizada</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Tu clave se almacena exclusivamente en este navegador (<code>localStorage</code>) y se
          utiliza de manera directa con las APIs oficiales de Google. Jamás se comparte con
          servidores intermedios ni se sube a repositorios de código.
        </p>
        <div className="pt-1 border-t border-outline/40">
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium inline-flex items-center gap-1 text-[11px]"
          >
            <span>Obtener una Gemini API Key gratuita en Google AI Studio</span>
            <span>↗</span>
          </a>
        </div>
      </div>
    </div>
  );
};
