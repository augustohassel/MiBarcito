# ADR-001: Stack Tecnológico Base, PWA Local-First y Estrategia de Transición hacia GCP

- **Fecha**: 2026-11-03
- **Estado**: Aceptada
- **Issue Asociado**: [#3](https://github.com/augustohassel/MiBarcito/issues/3)
- **Decisores**: @augustohassel (Propietario), Agente Antigravity

---

## Contexto y Problema

MiBarcito requiere una plataforma interactiva, ágil y utilizable en dispositivos móviles y de escritorio para la administración de botellas, control de stock y consulta de recetas de cócteles.
El sistema debe cumplir con tres requisitos fundamentales de arquitectura desde su concepción:
1. **Experiencia Mobile-First e Instalable (PWA)**: Capacidad de instalarse en la pantalla de inicio de teléfonos sin depender de tiendas de aplicaciones nativas.
2. **Operación Offline Garantizada**: El usuario debe poder consultar su inventario de despensa y recetario incluso en ausencia de conexión a internet o con conectividad inestable.
3. **Desacoplamiento para Migración hacia Google Cloud Platform (GCP)**: La aplicación inicia como una solución *Local-First* con almacenamiento en el cliente, pero debe contemplar la futura sincronización con servicios gestionados en GCP (Cloud Run, Firestore / Cloud SQL y APIs de Google Gemini).

---

## Alternativas Evaluadas

### 1. Framework y Tooling Frontend
- **Alternativa A (Vite + React 19 + TypeScript)**: Entorno liviano, velocidad de compilación casi instantánea (ESM nativo), ecosistema maduro de plugins PWA (`vite-plugin-pwa`) y mínima complejidad operativa.
- **Alternativa B (Next.js con App Router / SSR)**: Mayor peso y complejidad de infraestructura, requiere servidor Node.js o Edge Functions activo, mayor dificultad para empaquetar una PWA 100% offline autónoma sin backend inicial.
- *Elección*: **Alternativa A (Vite + React)** por su ligereza y facilidad para operar como SPA estática precacheada por Service Workers.

### 2. Motor de Persistencia Local
- **Alternativa A (`idb` - IndexedDB ligero)**: Wrapper minimalista (< 2 KB) con promesas nativas y tipado TypeScript estricto. No impone DSLs propietarios ni sobrecargas.
- **Alternativa B (`Dexie.js`)**: ORM de alto nivel para IndexedDB. Muy potente pero añade peso y acopla las entidades a su sintaxis propietaria de consultas.
- **Alternativa C (LocalStorage)**: Sincrónico, bloqueante del hilo principal, limitado a 5 MB y sin soporte para indexación por categorías o transacciones.
- *Elección*: **Alternativa A (`idb`)** complementada con el **Patrón Repositorio**.

### 3. Estilizado y UI
- **Alternativa A (Tailwind CSS v4 con `@tailwindcss/vite`)**: Integración directa en el pipeline de Vite mediante una directiva CSS unificada, compilación ultra rápida basada en Rust/LightningCSS, sin necesidad de `postcss.config.js` ni `tailwind.config.js`.
- **Alternativa B (Tailwind CSS v3)**: Requiere configuración tradicional con PostCSS y archivos de configuración auxiliares.
- *Elección*: **Alternativa A (Tailwind CSS v4)** por simplicidad de configuración y velocidad.

---

## Decisión Adoptada

1. **Scaffolding**: Se adopta el stack **React 19 + TypeScript + Vite + Tailwind CSS v4**.
2. **Capacidades PWA**: Se incorpora `vite-plugin-pwa` configurando Web App Manifest (`manifest.webmanifest`), iconos SVG vectoriales adaptativos y Service Worker con Workbox generando precache completo de la SPA Shell (`navigateFallback: '/index.html'`).
3. **Patrón Repositorio Desacoplado**:
   - Se definen interfaces puras en la capa de dominio (`src/domain/repositories/inventory-repository.interface.ts`).
   - Se implementa `IndexedDBInventoryRepository` utilizando `idb` como almacenamiento principal.
   - Se incorpora `InMemoryInventoryRepository` como mecanismo de contingencia automático ante fallas o bloqueos de IndexedDB (ej. navegación privada restrictiva o cuotas bloqueadas).
   - Se inyecta el repositorio a los componentes mediante React Context (`InventoryProvider`), garantizando que la UI jamás acceda directamente al motor de persistencia.
4. **Tooling de Calidad**:
   - **Vitest** con `@testing-library/react`, `@testing-library/jest-dom` y `fake-indexeddb` para ejecución de pruebas unitarias locales rápidas y determinísticas.

---

## Estrategia de Transición hacia Google Cloud Platform (GCP)

El desacoplamiento mediante `IInventoryRepository` establece el contrato exacto para la siguiente fase de arquitectura:
- **Fase Actual (Local-First)**: Los componentes consumen `IInventoryRepository` provisto por `IndexedDBInventoryRepository`.
- **Fase Futura (GCP Backend & Sync)**:
  - Se creará una implementación `GcpHttpInventoryRepository` que interactuará mediante llamadas REST o gRPC-Web hacia una API desarrollada en Go/Python/Node.js desplegada en **Google Cloud Run**.
  - La base de datos central residirá en **Google Cloud Firestore** (modo Datastore/Document) o **Google Cloud SQL** (PostgreSQL).
  - Se añadirá una estrategia de sincronización bidireccional (sincronizar cambios locales en IndexedDB cuando regrese la conexión hacia Firestore).
  - La sustitución de la implementación se realizará en un único punto (`InventoryProvider`), sin alterar un solo componente de la interfaz ni modelo de dominio.

---

## Consecuencias y Trade-offs

### Positivas
- Arranque instantáneo y costo cero de infraestructura en la etapa inicial.
- Capacidad de uso en bares, despensas o eventos sin cobertura de internet gracias a la PWA.
- Base tipada, testeada y modular con 100% de cobertura en modelos de dominio y adaptadores de persistencia.

### Mitigaciones
- **Pérdida de datos locales**: Si el usuario borra los datos de navegación del dispositivo, el inventario local se reinicia. Esto se mitiga documentando la advertencia y priorizando el módulo de sincronización con GCP en el roadmap.
- **Entornos sin IndexedDB**: El factory `createInventoryRepository()` detecta fallas y activa `InMemoryInventoryRepository` sin interrumpir la navegación.

