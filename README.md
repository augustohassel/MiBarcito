# MiBarcito 🍸

**MiBarcito** es una aplicación diseñada para gestionar de forma inteligente el inventario personal de bebidas y botellas en despensa, junto con un recetario dinámico de coctelería asistido por Inteligencia Artificial.

---

## 🎯 Objetivos Principales

1. **Gestión de Despensa e Inventario**: Llevar un registro claro y detallado de las bebidas disponibles en el hogar, controlando stock, volúmenes y niveles de reposición.
2. **Recetario Inteligente de Cócteles**: Sugerir tragos y recetas que pueden prepararse directamente con las bebidas e ingredientes que se tienen en inventario.
3. **Asistencia de IA Multimodal**:
   - Reconocimiento visual de etiquetas y botellas a partir de fotos para carga rápida de información.
   - Búsqueda web para enriquecer datos y precios estimados de mercado.
4. **Métricas y Valoración**: Conocer el costo total actualizado del bar hogareño y seguir la evolución de la inversión en el tiempo.

---

## 📋 Historias de Usuario Clave

- **Carga de Bebidas**:
  - Carga manual detallada (nombre, marca, tipo, graduación, volumen, costo).
  - Carga automática mediante fotografía de la botella/etiqueta analizada por IA.
  - Enriquecimiento con búsqueda web automática para obtener precios y datos complementarios.
- **Gestión de Stock y Favoritos**:
  - CRUD completo: edición, actualización de nivel de líquido y eliminación de ítems.
  - Marcado de bebidas y tragos favoritos.
  - Filtros y ordenamientos múltiples en el inventario (por tipo, volumen restante, precio, fecha de ingreso).
  - Notificaciones y alertas de stock bajo cuando una bebida desciende de su umbral mínimo.
- **Coctelería Dinámica**:
  - Recomendación de tragos posibles de preparar con las botellas en inventario ("¿Qué puedo armar hoy?").
  - Ideas de ingredientes faltantes para desbloquear nuevas recetas.
- **Métricas**:
  - Panel con el valor total actualizado del bar y estadísticas de consumo/reposición.

---

## ☁️ Sincronización en la Nube (Google Cloud + Firestore) y Modo Local

**MiBarcito** funciona bajo una arquitectura **Local-First + Cloud Sync** a costo **$0.00 USD/mes**:
- **Sin configuración cloud**: Opera 100% sobre `IndexedDB` local en el navegador sin requerir cuenta ni variables de entorno.
- **Con cuenta de Google**: Permite iniciar sesión (`⚙️ Configuración -> 💾 Respaldo & Nube`), fusionar automáticamente las botellas ya cargadas en el dispositivo (`IndexedDB -> Firestore`) sin perder datos, sincronizar entre celular y PC, descargar/importar copias de seguridad en `.json` y cerrar sesión en cualquier momento.

📚 **Documentación de Infraestructura y Verificación en GCP**:
- **[Guía APB de Verificación y Monitoreo en GCP / Firebase (`docs/guia-verificacion-gcp.md`)](docs/guia-verificacion-gcp.md)**: Incluye todos los enlaces directos a la consola de Firebase y GCP (`mibarcito-app`), el paso a paso para verificar/activar el proveedor de Google OAuth, cómo configurar `.env.local` y las variables `VITE_FIREBASE_*` en GitHub Actions, y cómo auditar tus datos y cuotas gratuitas.
- **[Guía de Infraestructura Terraform (`infra/README.md`)](infra/README.md)**: Aprovisionamiento declarativo de Firestore, Identity Platform, Security Rules y CI/CD con OIDC.

---

## 🛠️ Convenciones y Flujo de Desarrollo

El proyecto opera bajo el flujo estricto de desarrollo para agentes y colaboradores:
- **Rama base**: `dev`
- **Ramas de tareas**: `issue/<n>` originadas desde `dev`
- **Integración**: Pull Requests dirigidos hacia `dev`
- **Producción**: Merge a `master` mediante PR desde `dev`
- **Glosario del Dominio**: Documentado y mantenido en [docs/glosario.md](docs/glosario.md).
- **Decisiones Técnicas**: Registradas en [docs/decisiones/](docs/decisiones/).
