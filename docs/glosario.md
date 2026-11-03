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

### Trago / Cóctel (Receta)
- **Definición**: Fórmula de preparación compuesta por una lista de ingredientes (bebidas y medidas requeridas), cristalería recomendada, método de preparación y paso a paso.
- **Alcance / Propósito**: Servir de guía culinaria y sugerir opciones de elaboración según las existencias actuales de la despensa.

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

### Sector de Configuración
- **Definición**: Panel centralizado accesible mediante el icono de engranaje (⚙️) en el encabezado principal de la aplicación.
- **Alcance / Propósito**: Permite gestionar los parámetros maestros de la aplicación (iniciando por la gestión dinámica de categorías de bebidas) y está preparado arquitectónicamente para alojar futuras solapas como respaldo, exportación y sincronización en la nube.
- **Lo que NO es**: No es una pantalla de carga de stock de botellas individuales ni de recetas.

---

### Tema Visual (Modo Claro / Modo Oscuro)
- **Definición**: Identidad visual semántica inspirada en Google Material 3 que adopta un modelo mental binario y determinístico (`'light' | 'dark'`), independiente de la configuración del sistema operativo.
- **Alcance / Propósito**: Garantizar legibilidad, contraste y confort visual tanto en entornos iluminados como nocturnos mediante tokens semánticos sobre Tailwind CSS v4, alternancia rápida con botón en el encabezado, persistencia local (`mibarcito_theme`) y prevención de parpadeo (FOUC).
- **Lo que NO es**: No es un selector multitema con colores personalizados ni una sincronización dependiente de `prefers-color-scheme`.



