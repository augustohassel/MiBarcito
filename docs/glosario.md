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

