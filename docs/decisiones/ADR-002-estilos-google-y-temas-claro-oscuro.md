# ADR-002: Identidad Visual Google Material 3 y Soporte Bimodal Claro/Oscuro

- **Fecha**: 2026-11-03
- **Estado**: Aceptada
- **Issue Asociado**: [#15](https://github.com/augustohassel/MiBarcito/issues/15)
- **Decisores**: @augustohassel (Propietario), Agente Antigravity

---

## Contexto y Problema

MiBarcito contaba inicialmente con estilos visuales oscuros fijos basados en clases utilitarias rígidas de Tailwind (`slate-*`) hardcodeadas directamente en componentes, sin soporte para modo claro ni abstracción semántica.
Esto presentaba los siguientes inconvenientes:
1. **Falta de accesibilidad y contraste adaptable**: Dificultad de lectura en entornos con alta luminosidad natural o al aire libre al carecer de un modo claro.
2. **Acoplamiento a paletas fijas**: El uso directo de `slate-950`, `slate-900`, etc. impedía la evolución visual ordenada o cambios de diseño.
3. **Identidad no alineada con el ecosistema de diseño Google**: Dado que el roadmap contempla servicios y APIs del ecosistema Google (GCP, Gemini), la aplicación requería una identidad consistente inspirada en **Google Material 3 (MD3)**.

---

## Alternativas Evaluadas

### 1. Modelo Mental de Temas
- **Alternativa A (Binario Determinístico `'light' | 'dark'` con Modo Claro por defecto)**: Similar a la solución probada en Listita (ADR-0001). Dos estados cerrados, predecibles, sin dependencias implícitas del sistema operativo, con alternancia manual directa por botón en el encabezado.
- **Alternativa B (Tri-estado con Sincronización Automática `'system' | 'light' | 'dark'`)**: Consulta `prefers-color-scheme`. Añade complejidad de listeners, casos de parpadeo y comportamiento impredecible si las preferencias del sistema cambian en segundo plano.
- *Elección*: **Alternativa A (Binario Determinístico)** por simplicidad, claridad cognitiva para el usuario y control predecible.

### 2. Implementación de Tokens de Diseño
- **Alternativa A (Tokens Semánticos vía `@theme` y variables CSS en Tailwind CSS v4)**: Variables `:root` y `.dark` vinculadas a abstracciones semánticas (`--color-surface`, `--color-surface-container`, `--color-on-surface`, `--color-primary`, etc.). Cero clases fijas de color en los componentes.
- **Alternativa B (Prefijos `dark:` duplicados en todas las clases utilitarias de Tailwind)**: Requiere escribir `bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100` en cada elemento JSX, multiplicando el tamaño del markup y la propensión a inconsistencias.
- *Elección*: **Alternativa A (Tokens Semánticos)** por mantenibilidad, DRY y consistencia arquitectónica.

### 3. Prevención de Destello Inicial (FOUC)
- **Alternativa A (Script síncrono bloqueante temprano en el `<head>` de `index.html`)**: Lee `localStorage('mibarcito_theme')` y aplica/remueve inmediatamente `.dark` y actualiza `<meta name="theme-color">` antes del parseo del DOM del body y del bundle JS.
- **Alternativa B (Efecto React exclusivo en `useTheme`)**: Provoca destello visual blanco u oscuro de varios milisegundos mientras React hidrata y monta el componente.
- *Elección*: **Alternativa A (Script síncrono anti-flicker en `<head>`)**.

---

## Decisión Adoptada

1. **Tokens Semánticos Google Material 3**:
   - Se configuran en `src/index.css` utilizando la directiva `@theme` de Tailwind CSS v4:
     - Superficies tonales: `surface`, `surface-container`, `surface-container-high`.
     - Tipografía y contrastes: `on-surface`, `on-surface-variant`.
     - Bordes y divisores: `outline`, `outline-variant`.
     - Acento Google Azul (`#1a73e8` en claro / `#8ab4f8` en oscuro) para acciones primarias y foco.
     - Acentos de estado funcionales (ámbar para alertas/favoritos, esmeralda para métricas positivas, rojo para peligro/eliminación).
   - Se incorpora la tipografía **Google Roboto** con `font-display: swap` y fallback al stack nativo del sistema en `index.html`.

2. **Hook y Lógica de Tema (`useTheme`)**:
   - Tipado estricto `ThemeMode = 'light' | 'dark'`, inicializado por defecto en `'light'`.
   - Persistencia segura en `localStorage('mibarcito_theme')` con degradación elegante a memoria en caso de navegación privada restrictiva o cuotas bloqueadas.
   - Sincronización reactiva de `<meta name="theme-color">` (`#ffffff` en claro / `#1f1f1f` en oscuro).

3. **Prevención de FOUC**:
   - Script síncrono en `<head>` de `index.html` que evalúa la preferencia antes de pintar la vista.

4. **Refactor Integral de Componentes**:
   - Eliminación total del 100% de clases `slate-*` hardcodeadas en todos los componentes y modales de la aplicación.
   - Botón toggle Sol (☀️) / Luna (🌙) accesible en la cabecera principal (`src/App.tsx`).
   - Regla CSS global para controles nativos `<select>` garantizando contraste y legibilidad en las opciones desplegadas.

---

## Consecuencias y Trade-offs

### Positivas
- Identidad moderna, limpia y alineada con Google Material 3.
- Experiencia visual cómoda tanto en modo diurno como nocturno con alternancia en un solo clic.
- Cero destello o parpadeo (FOUC) al recargar la aplicación.
- Código limpio, desacoplado y semántico sin prefijos de color hardcodeados.

### Mitigaciones
- **Restricción de `localStorage`**: Manejada con bloques `try/catch` en lectura y escritura para que la aplicación continúe funcionando en memoria sin lanzar excepciones no controladas.
- **Selects nativos en navegadores con temas dispares**: Solucionado mediante reglas de estilo en `src/index.css` fijando fondo y color tipográfico sobre `select option`.

