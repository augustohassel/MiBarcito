# ADR-003: Arquitectura de Carga Asistida por IA Multimodal con Google Gemini 1.5 Flash

- **Estado**: Aceptado
- **Fecha**: 2026-11-04
- **Contexto**: Issue #6 - Carga Asistida por IA Multimodal (Foto de Botella y Búsqueda Web de Precios)

---

## 1. Contexto y Problemática

El alta manual de bebidas e ingredientes en la despensa personal presenta fricción: transcribir nombre comercial, marca, graduación alcohólica (% ABV), volumen en ml y precio estimado requiere tiempo y atención a los detalles de la etiqueta.
El objetivo es permitir que el usuario capture una fotografía de la botella/etiqueta con su celular o cargue un archivo y que la inteligencia artificial extraiga los metadatos clave y consulte precios de referencia de mercado en la web.

Restricciones clave del proyecto:
1. **PWA Local-First**: La aplicación funciona en el navegador del usuario y en modo offline sin backend obligatorio en la fase MVP.
2. **Seguridad y Privacidad**: Prohibido versionar credenciales o exponer API keys en código fuente o repositorios remotos.
3. **Eficiencia en Red y Memoria Móvil**: Las fotos de cámaras de smartphones modernos pesan entre 10 y 25 MB (4000x3000px). Subir imágenes de ese tamaño degrada la experiencia, satura la red celular y arriesga timeouts.
4. **Confirmación Humana Obligatoria**: La IA asiste y sugiere, pero nunca debe persistir registros en la despensa sin la revisión y aprobación explícita del usuario.

---

## 2. Decisión Arquitectónica

Se adopta una solución integral dividida en cuatro pilares:

### A. Gestión Segura de Credenciales en el Cliente
- La API Key de Google Gemini se almacena exclusivamente en `localStorage` (`mibarcito_gemini_api_key`) del navegador del usuario.
- Como respaldo en entornos locales de desarrollo, se acepta la variable `VITE_GEMINI_API_KEY`.
- Se incorpora una solapa dedicada **"Inteligencia Artificial"** en el diálogo de configuración (`ConfiguracionModal`) que permite ingresar, enmascarar, visualizar y revocar la clave en cualquier momento, con enlace directo a Google AI Studio.

### B. Pre-procesamiento y Compresión en Cliente con Canvas
- Antes de emitir cualquier solicitud a la API, la imagen se redimensiona en el cliente mediante la API nativa de `Canvas` (`image-processor.ts`), acotando su dimensión mayor a 1280 px y comprimiendo a formato JPEG con calidad 80%.
- Esto reduce el tamaño de transferencia de ~15 MB a menos de 500-800 KB, minimizando la latencia de red y el consumo de datos móviles sin pérdida de legibilidad para el OCR/visión multimodal.
- En caso de entornos de testing o navegadores sin contexto 2D, se aplica fallback transparente.

### C. Invocación a Gemini 1.5 Flash con Extracción JSON y Google Search Grounding
- Se invoca el endpoint oficial `models/gemini-1.5-flash:generateContent`.
- Se configura un prompt sommelier estructurado para forzar la respuesta en JSON puro con campos tipificados: `nombre`, `marca`, `categoriaSugerida`, `graduacionAlcoholica`, `precioEstimado`, `volumenTotalMl`, `notas` y `esLegible`.
- Se activa la herramienta de Grounding (`tools: [{ googleSearch: {} }]`) para consultar estimaciones de precios minoristas locales.
- **Resiliencia ante cuota/tier de Search**: Si el grounding arroja error 400 (ej. clave de nivel gratuito sin soporte de search tools), el servicio reintenta automáticamente la petición sin la herramienta de búsqueda, asegurando que el reconocimiento visual nunca falle por indisponibilidad de precios web.

### D. Flujo UI/UX con "Human-in-the-Loop" y Fallback Amigable
- **Confirmación Humana**: Los datos inferidos se pre-cargan en `BebidaFormModal`. El usuario visualiza la miniatura de la foto capturada como referencia visual y puede editar libremente cualquier campo antes de presionar "Crear Bebida".
- **Caso de Falla (Foto borrosa / Error de red / Timeout)**: Ante fotos ilegibles, errores 429/403 o pérdida de conexión, el sistema captura la excepción, muestra un mensaje descriptivo no bloqueante y deja abierto el formulario manual manteniendo la miniatura de la foto para que el usuario transcriba visualmente los datos.
- **Higiene de Almacenamiento**: La foto capturada solo se mantiene en memoria volátil de React durante el flujo de alta; no se almacena en base de datos para no saturar la cuota de IndexedDB.

---

## 3. Alternativas Evaluadas

1. **Backend Proxy en Cloud Run / Cloud Functions**:
   - *Descartada para el MVP*: Añade costos de infraestructura y complejidad de despliegue antes de consolidar la arquitectura de sincronización en la nube (planificada para fases posteriores según ADR-001).
2. **Guardado Automático Directo en Despensa**:
   - *Descartada*: Podría introducir alucinaciones o datos imprecisos de graduación alcohólica o categorías erróneas en el inventario personal. La intervención humana es un principio innegociable.
3. **Enviar Imagen Original sin Compresión**:
   - *Descartada*: Fotos de 15 MB generan tiempos de carga superiores a 10 segundos en redes móviles y superan los límites de tamaño en payloads base64.

---

## 4. Consecuencias y Estado

- **Positivas**: Carga de botellas ultra ágil (de 1-2 minutos a menos de 5 segundos), control total de privacidad por el usuario, cero costos fijos de servidor y manejo robusto de contingencias offline o fotos borrosas.
- **Mitigaciones**: La clave en `localStorage` solo tiene acceso a la cuota de la cuenta de Google del propio usuario y no se comparte con ningún tercero.

