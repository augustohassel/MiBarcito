# Reglas y Guía para Agentes de IA - MiBarcito

Este documento define el contexto, las convenciones técnicas y las reglas operativas estrictas para el desarrollo del proyecto **MiBarcito**.

---

## 1. Visión y Propósito del Proyecto
- **Nombre**: MiBarcito
- **Propósito**: Aplicación para la gestión inteligente del inventario de bebidas en despensa personal y recetario dinámico de coctelería.
- **Objetivos clave**:
  - Control de stock y alertas de reposición para bebidas e ingredientes.
  - Carga asistida por IA (reconocimiento visual por fotografía y búsqueda de precios/metadatos en la web).
  - Recetario inteligente con sugerencias de tragos basadas en el inventario disponible.
  - Métricas de valoración y costo total actualizado del bar hogareño.
- **Principios No Negociables**:
  - **Privacidad y Seguridad**: Prohibido versionar credenciales, API keys (ej. OpenAI, Gemini, etc.), variables de entorno sensibles o datos privados.
  - **Validación Local Primero**: Todo cambio de código debe compilarse y validarse localmente mediante tests automáticos o build antes de considerarse completo.
  - **Commits Claros y Atómicos**: Seguir la convención Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).

---

## 2. Flujo de Git y Estrategia de Ramas
- **Rama base de desarrollo**: `dev`.
- **Ramas de tareas**: `issue/<n>` originadas **siempre a partir de `dev`** (`git checkout dev && git pull origin dev && git checkout -b issue/<n>`). Nunca desde `master` ni otras ramas.
- **Pull Requests de tareas**: Siempre orientados hacia `dev`. Al completarse el merge, la rama `issue/<n>` se elimina.
- **Promoción a producción**: Pull Request desde `dev` hacia `master` una vez integrado y validado en `dev`.
- **Trabajo sin issue**: Solo permitido si el usuario lo solicita explícitamente (siguiendo las reglas de `trabajo-sin-issue.md`).
- **Prohibición Estricta de Push**: Prohibido ejecutar `git push` hacia cualquier repositorio remoto sin la aprobación previa y explícita del usuario.

---

## 3. Orquestación Escalonada y Subagentes
- **Nivel Liviano** (1-2 archivos, cambios directos o puntuales): Se aborda directamente por el agente principal.
- **Nivel Estándar** (complejidad media, nuevas pantallas o reglas abiertas): Refinamiento funcional con el subagente de solo lectura `analista` y auditoría de calidad previa a PR con `supervisor`.
- **Nivel Profundo** (>3 archivos, integraciones complejas de IA/multimodal o cambios de arquitectura): Análisis exhaustivo con `analista`, desarrollo por fases y supervisión rigurosa de calidad y simplificación con `supervisor`.
- **Modo de Operación**: Los subagentes `analista` y `supervisor` operan siempre en modo **solo lectura** (`invoke_subagent`). Toda edición de archivos y diálogo con el usuario permanece en el agente principal.

---

## 4. Reglas Transversales de Calidad
- **Lectura completa de skills**: Leer cada `SKILL.md` y sus referencias de principio a fin antes de ejecutar cualquier paso.
- **Diagramas de flujo**: Incluir un bloque `mermaid` (`flowchart`) al analizar o definir requerimientos con pasos, decisiones o cambios de estado, marcando nodos abiertos como `[Por confirmar]`.
- **Instrucciones de prueba paso a paso**: Entregar siempre pasos reproducibles indicando dónde ejecutar, comando o acción exacta, qué se ve si sale bien y dónde mirar si falla.

---

## 5. Dominio y Decisiones Arquitectónicas
- **Glosario de Conceptos (`docs/glosario.md`)**: Registrar y mantener actualizada la jerga y entidades del dominio en tiempo real (ej. Bebida, Trago, Despensa, Stock Mínimo).
- **Registro de Decisiones (`docs/decisiones/`)**: Documentar toda elección arquitectónica difícil de revertir y que surja de evaluar alternativas reales (stack frontend/backend, base de datos, motor de visión/IA, etc.).

