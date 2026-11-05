# Glosario de Conceptos - MiBarcito

Este documento reúne la terminología, entidades de negocio y conceptos funcionales de **MiBarcito** para mantener un entendimiento unificado entre desarrolladores y agentes de IA.

---

### Bebida (Ítem de Inventario)
- **Definición**: Unidad de producto líquido o ingrediente alcohólico/no alcohólico registrado en el sistema con sus propiedades básicas (nombre, marca, tipo, volumen total, volumen restante o porcentaje, precio estimado).
- **Alcance / Propósito**: Constituye la unidad base de stock en la despensa del usuario.
- **Lo que NO es**: No es una receta de trago en sí misma, aunque puede ser un ingrediente de uno o más tragos.

---

### Despensa / Inventario
- **Definición**: Conjunto total de bebidas e insumos disponibles físicamente que el usuario posee en su hogar o bar personal.
- **Alcance / Propósito**: Permite monitorear el stock disponible, calcular el valor monetario total del bar y filtrar qué cócteles es posible preparar.

---

### Trago / Cóctel (Receta / RecetaTrago)
- **Definición**: Fórmula de preparación compuesta por una lista de ingredientes (bebidas y medidas requeridas en ml), cristalería recomendada, método de preparación (directo, batido, refrescado, etc.), paso a paso y metadatos de autoría (`esPropia`) y favoritismo (`esFavorito`).
- **Alcance / Propósito**: Servir de guía culinaria, permitir la creación de recetas propias y sugerir opciones de elaboración según las existencias actuales de la despensa.

---

### Receta Propia (de Autor) vs. Catálogo Clásico
- **Definición**: Distinción de autoría y mutabilidad en las recetas del bar hogareño mediante la bandera booleana `esPropia`.
- **Alcance / Propósito**: Las recetas de catálogo clásico (`esPropia: false`) son fórmulas predeterminadas del sistema (ej. Negroni, Gin Tonic, Old Fashioned) de solo lectura, protegidas contra eliminación o edición directa accidental, pero permitiendo marcarlas como favoritas o clonarlas mediante el botón *"Duplicar a mis recetas"*. Las recetas de autor (`esPropia: true`) admiten CRUD completo (creación, edición y borrado) por parte del usuario.

---

### Motor de Recomendación Dinámico
- **Definición**: Algoritmo reactivo en tiempo real (`recetario-motor.ts`) que evalúa cada ingrediente de una receta frente a las botellas presentes en la **Despensa** (por Categoría, Subcategoría y volumen restante en mililitros) y frente a las guarniciones e insumos presentes en el **Almacén** (por vínculo directo `insumoId` y estado *"Tengo / No tengo"*).
- **Alcance / Propósito**: Clasifica el recetario en tres sectores prioritarios:
  1. **"¿Qué puedo armar hoy?"**: Cócteles donde el 100% de los ingredientes obligatorios están disponibles (botellas con `volumenRestanteMl >= medidaRequerida` en Despensa e insumos obligatorios con `disponible: true` en Almacén).
  2. **"Casi listos"**: Fórmulas a las que les falta únicamente 1 o 2 ingredientes obligatorios para estar completas, destacando qué botellas o insumos de almacén faltan adquirir.
  3. **"Catálogo general"**: Cócteles con más de 2 insumos faltantes.

---

### Deducción Atómica de Stock y Protección Anti-Saldo Negativo
- **Definición**: Regla de consistencia transaccional ejecutada al confirmar la acción *"Preparar Cóctel"*, donde el sistema deduce exactamente los mililitros consumidos del `volumenRestanteMl` de cada botella seleccionada.
- **Alcance / Propósito**: Si el volumen requerido de al menos un ingrediente excede las existencias reales en la despensa, la acción se bloquea de forma preventiva en la interfaz y en el repositorio, garantizando que ninguna botella quede con saldo negativo (`volumenRestanteMl < 0`). Si el usuario posee múltiples botellas compatibles, el diálogo le permite elegir explícitamente cuál consumir.

---

### Clasificación de Ingredientes (Bebida vs. Guarnición / Insumo)
- **Definición**: Tipificación semántica (`tipo: 'bebida' | 'guarnicion_insumo'`) para diferenciar botellas que forman parte del inventario físico medible en mililitros (Despensa) de insumos sólidos, frescos o guarniciones gestionados mediante disponibilidad booleana (Almacén).
- **Alcance / Propósito**: Los ingredientes de tipo `bebida` descuentan mililitros de las botellas en la Despensa al preparar un cóctel, mientras que los de tipo `guarnicion_insumo` consultan su disponibilidad (`Tengo / No tengo`) en el **Almacén** sin descontar volumen líquido.

---

### Almacén (Insumos y Guarniciones)
- **Definición**: Módulo e inventario no líquido (`InsumoAlmacen`, accesible desde la solapa `🍋 Almacén`) donde el usuario gestiona las guarniciones, cítricos, hierbas, encurtidos, endulzantes y básicos de coctelería (ej. Hielo, Naranja, Limón, Lima, Pepino, Menta fresca, Romero fresco, Aceitunas verdes, Cerezas al marrasquino, Azúcar, Sal fina) mediante un interruptor rápido de disponibilidad booleana (`disponible: true | false`, *"Tengo / No tengo"*).
- **Alcance / Propósito**: Permite que el motor del recetario y el modal de detalle de cada cóctel reflejen con exactitud qué guarniciones o insumos posee realmente el usuario (evitando marcar como disponibles guarniciones ausentes como aceitunas o menta), además de admitir el alta y baja de insumos personalizados.
- **Lo que NO es**: No controla gramaje, peso ni mililitros ni descuenta unidades automáticamente al preparar un trago.

---

### Carga Asistida por IA (Foto / Búsqueda Web)
- **Definición**: Mecanismo multimodal donde el usuario toma o sube una fotografía de una botella o etiqueta para autocompletar la ficha de la bebida (marca, tipo, graduación), complementado opcionalmente con búsqueda web para inferir precios de mercado o notas de cata.
- **Alcance / Propósito**: Agilizar el proceso de alta en el inventario reduciendo la fricción de la carga manual.
- **Lo que NO es**: No reemplaza la confirmación final por parte del usuario, quien siempre puede corregir los valores sugeridos.

---

### Alerta de Stock Bajo
- **Definición**: Notificación o indicador visual generado cuando el volumen o cantidad disponible de una bebida cae por debajo de un umbral predefinido por el usuario.
- **Alcance / Propósito**: Avisar con anticipación qué botellas requieren reposición o compra próxima.

---

### Métrica de Valoración / Costo Total
- **Definición**: Reporte consolidado que estima el valor financiero del inventario completo a partir del costo registrado de compra o precios actualizados periódicamente.
- **Alcance / Propósito**: Permitir al usuario entender la inversión económica y valor monetario de su despensa a lo largo del tiempo.

---

### Bebida Favorita
- **Definición**: Marcador booleano (`esFavorito`) asignado a una bebida de la despensa por decisión del usuario.
- **Alcance / Propósito**: Destacar botellas predilectas o de uso frecuente y habilitar filtrado rápido prioritario en la vista de inventario.
- **Lo que NO es**: No modifica las reglas de alerta de stock bajo ni las cantidades disponibles de la botella.

---

### Categoría de Bebida
- **Definición**: Clasificación taxonómica dinámica (`Categoria`) utilizada para catalogar las bebidas del bar hogareño según su naturaleza o rol en coctelería (ej. destilado, licor, vino, cerveza, aperitivo/bitter, etc.).
- **Alcance / Propósito**: Permite filtrar y segmentar el inventario en la despensa, facilitando la búsqueda y la preparación de recetas. Soporta categorías predeterminadas del sistema y categorías personalizadas creadas por el usuario, con protección permanente de la categoría comodín (*"Otro"*) y bloqueo de eliminación si tiene bebidas asignadas.
- **Lo que NO es**: No es un atributo inmutable fijado en código; es una entidad gestionable desde el sector de configuración y persistida localmente.

---

### Subcategoría de Bebida
- **Definición**: Clasificación secundaria y granular opcional (`subcategoria` en `Bebida` y `subcategorias` en `Categoria`) que especifica el tipo concreto de bebida dentro de su categoría padre (ej. Gin, Vodka, Ron dentro de Destilado; Tinto, Blanco dentro de Vino; Triple Sec dentro de Licor; Bitter Rojo, Fernet, Vermut Rosso dentro de Aperitivo / Bitter).
- **Alcance / Propósito**: Permite emparejar ingredientes de tipo bebida en el recetario (`IngredienteReceta`) y durante la preparación de tragos de manera taxonómica estricta por `categoriaId` y `subcategoria` (y no por palabras clave en el nombre comercial), seleccionándose mediante listas desplegables tanto al registrar botellas como al crear recetas de autor. Se gestiona de forma configurable desde el panel de configuración de categorías y cuenta con pre-siembra estándar y backfill transparente para bases de datos preexistentes.
- **Lo que NO es**: No depende del texto libre o nombre de fantasía de la botella para evaluar disponibilidad en recetas estructuradas, ni constituye una estructura jerárquica de más de dos niveles.

---

### Sector de Configuración
- **Definición**: Panel centralizado accesible mediante el icono de engranaje (⚙️) en el encabezado principal de la aplicación.
- **Alcance / Propósito**: Permite gestionar los parámetros maestros de la aplicación (iniciando por la gestión dinámica de categorías de bebidas) y está preparado arquitectónicamente para alojar futuras solapas como respaldo, exportación y sincronización en la nube.
- **Lo que NO es**: No es una pantalla de carga de stock de botellas individuales ni de recetas.

---

### Tema Visual (Modo Claro / Modo Oscuro)
- **Definición**: Identidad visual semántica inspirada en Google Material 3 que adopta un modelo mental binario y determinístico (`'light' | 'dark'`), independiente de la configuración del sistema operativo.
- **Alcance / Propósito**: Garantizar legibilidad, contraste y confort visual tanto en entornos iluminados como nocturnos mediante tokens semánticos sobre Tailwind CSS v4, alternancia rápida con botón en el encabezado, persistencia local (`mibarcito_theme`) y prevención de parpadeo (FOUC).
- **Lo que NO es**: No es un selector multitema con colores personalizados ni una sincronización dependiente de `prefers-color-scheme`.

---

### Persistencia Cloud y Aislamiento por Propietario (Firestore / Identity Platform)
- **Definición**: Arquitectura de almacenamiento y autenticación serverless en Google Cloud Platform (Cloud Firestore en modo Native + Identity Platform / Firebase Auth) gestionada como código mediante Terraform dentro del propio repositorio (`infra/`), operando en el nivel gratuito perpetuo ($0/mes).
- **Alcance / Propósito**: Permitir el respaldo en la nube y el acceso sincronizado multi-dispositivo (celular y PC) a las colecciones de bebidas, categorías, recetas e insumos del usuario autenticado con Google, aislando estrictamente los documentos bajo la ruta `/users/{userId}/...` mediante reglas de seguridad de servidor (`firestore.rules`) que verifican `request.auth.uid == userId` (y opcionalmente el correo del propietario autorizado). Convive con el almacenamiento `IndexedDB` para preservar la experiencia Local-First y offline.
- **Lo que NO es**: No es una base de datos pública ni compartida entre distintos usuarios; toda lectura o escritura anónima o cruzada es rechazada con `PERMISSION_DENIED`.

