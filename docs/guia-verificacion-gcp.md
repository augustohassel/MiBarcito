# Guía APB de Verificación y Monitoreo en Google Cloud Platform (`mibarcito-app`)

Este documento explica paso a paso —con enlaces directos— **dónde entrar y qué mirar** en la consola de **Google Cloud (GCP)** y en la **Consola de Firebase** para comprobar que todos los servicios de **MiBarcito** estén activos, seguros, recibiendo tus botellas y operando dentro del **Free Tier ($0.00 USD/mes)**.

> 💡 **Dato clave**: El ID de tu proyecto es **`mibarcito-app`**. Todos los enlaces de abajo ya tienen ese ID incluido para que puedas abrirlos con un solo clic.

---

## Mapa Rápido de Accesos Directos

| Qué querés revisar | Enlace directo |
| :--- | :--- |
| **1. Ver tus botellas, recetas e insumos guardados en la nube** | [Abrir Firestore Data (Firebase Console)](https://console.firebase.google.com/project/mibarcito-app/firestore/databases/-default-/data) |
| **2. Ver las Reglas de Seguridad (`firestore.rules`) activas** | [Abrir Firestore Rules (Firebase Console)](https://console.firebase.google.com/project/mibarcito-app/firestore/databases/-default-/rules) |
| **3. Ver usuarios registrados y tu UID de Google** | [Abrir Authentication Users (Firebase Console)](https://console.firebase.google.com/project/mibarcito-app/authentication/users) |
| **4. Habilitar Google Login y ver Dominios Autorizados** | [Abrir Sign-in Method / Settings (Firebase Console)](https://console.firebase.google.com/project/mibarcito-app/authentication/providers) |
| **5. Obtener las 4 variables `VITE_FIREBASE_*` para GitHub** | [Abrir Configuración del Proyecto (Firebase Console)](https://console.firebase.google.com/project/mibarcito-app/settings/general) |
| **6. Ver cuotas de uso diario (Free Tier $0/mes)** | [Abrir Firestore Usage & Quotas (Firebase Console)](https://console.firebase.google.com/project/mibarcito-app/firestore/databases/-default-/usage) |
| **7. Ver las APIs habilitadas por Terraform en GCP** | [Abrir APIs & Services Dashboard (GCP Console)](https://console.cloud.google.com/apis/dashboard?project=mibarcito-app) |
| **8. Ver el estado remoto de Terraform (`tfstate`) en GCS** | [Abrir Bucket `mibarcito-app-tfstate` (GCP Console)](https://console.cloud.google.com/storage/browser/mibarcito-app-tfstate?project=mibarcito-app) |
| **9. Ver el Pool OIDC y Service Account de GitHub Actions** | [Abrir Workload Identity Pools (GCP Console)](https://console.cloud.google.com/iam-admin/workload-identity-pools?project=mibarcito-app) |

---

## Paso a Paso Detallado: ¿Qué debería verse en cada pantalla?

### 1. Base de Datos Cloud Firestore (Tus Botellas en la Nube)
- **Dirección**: https://console.firebase.google.com/project/mibarcito-app/firestore/databases/-default-/data
- **También en GCP Console**: https://console.cloud.google.com/firestore/databases/-default-/data/panel?project=mibarcito-app
- **Qué tenés que ver**:
  1. Una base de datos llamada **`(default)`** en modo **Native** ubicada en la región **`nam5` (us-central)**.
  2. Una vez que inicies sesión en **MiBarcito** con Google, aparecerá la colección raíz **`users`**.
  3. Dentro de **`users`**, verás un documento con tu **`{uid}`** (el identificador único de tu cuenta de Google).
  4. Al hacer clic en tu `{uid}`, verás las 4 subcolecciones de tu bar:
     - **`bebidas`**: Cada documento es una botella (con su `nombre`, `marca`, `volumenTotalMl`, `volumenRestanteMl`, `categoria`, `subcategoria`, `precioEstimado`, etc.).
     - **`categorias`**: Tus categorías predeterminadas y personalizadas.
     - **`recetas`**: El catálogo de recetas y tus recetas de autor (`esPropia: true`) o favoritas (`esFavorito: true`).
     - **`insumos`**: El estado *"Tengo / No tengo"* de tu Almacén.

---

### 2. Reglas de Seguridad de Firestore (`firestore.rules`)
- **Dirección**: https://console.firebase.google.com/project/mibarcito-app/firestore/databases/-default-/rules
- **Qué tenés que ver**:
  - Las reglas desplegadas automáticamente por Terraform donde solo el propietario autenticado (`request.auth != null && request.auth.uid == userId`) puede leer o escribir en `/users/{userId}/{document=**}`, y cualquier otro acceso tiene `allow read, write: if false;`.
- **Cómo probar que nadie más puede entrar**:
  - En esa misma pantalla tenés el botón **"Zona de pruebas de reglas" (Rules Playground)**. Si simulás una lectura `get` sobre `/users/otro-uid/bebidas/1` sin autenticación o con otro UID, verás un cartel rojo diciendo **Denegado (`PERMISSION_DENIED`)**.

---

### 3. Autenticación con Google y Dominios Autorizados (Paso a Paso APB)
- **Dirección de Proveedores**: https://console.firebase.google.com/project/mibarcito-app/authentication/providers
- **Dirección de Dominios Autorizados**: https://console.firebase.google.com/project/mibarcito-app/authentication/settings
- **Dirección de Usuarios Conectados**: https://console.firebase.google.com/project/mibarcito-app/authentication/users

#### 🔍 Cómo saber si el proveedor de Google está habilitado (y cómo activarlo si no lo está)
1. Entrá a https://console.firebase.google.com/project/mibarcito-app/authentication/providers (o en el menú izquierdo de Firebase: **Compilación -> Authentication -> pestaña "Método de acceso" / "Sign-in method"**).
2. Mirá la tabla de **"Proveedores de acceso" (Sign-in providers)**:
   - **Caso A — Ya aparece "Google" en la lista con un tilde verde que dice `Habilitado` (`Enabled`)**: ¡Ya está listo! No tenés que tocar nada más ahí.
   - **Caso B — No aparece "Google" en la lista o dice `Inhabilitado` (`Disabled`)**:
     1. Hacé clic en el botón **"Agregar proveedor nuevo" (Add new provider)** (o hacé clic sobre la fila de **Google** si ya figura).
     2. En la ventana que se abre, elegí **Google**.
     3. Activá el interruptor (switch) de arriba a la derecha que dice **"Habilitar" (Enable)**.
     4. En el desplegable **"Correo electrónico de asistencia del proyecto" (Project support email)**, seleccioná tu propio correo de Google.
     5. Hacé clic en el botón **"Guardar" (Save)**.
     6. Vas a ver que ahora **Google** figura en la tabla con el estado **`Habilitado` (`Enabled`)**.

#### 🌐 Verificación de Dominios Autorizados y Usuarios
- En **Settings -> Dominios autorizados (`settings`)**: Deberías ver cargados por Terraform:
  - `localhost`
  - `127.0.0.1`
  - `augustohassel.github.io`
  - `barcito.hasselpunk.com`
  - `hasselpunk.com`
  - `mibarcito-app.firebaseapp.com`
  - `mibarcito-app.web.app`
- En **Users (`users`)**: Apenas inicies sesión desde MiBarcito en tu celular o PC, aparecerá tu correo de Google, la fecha de último acceso y tu **UID de usuario** (el mismo que da nombre a tu carpeta en Firestore).

---

### 4. Obtener las 4 Variables `VITE_FIREBASE_*` (Para `.env.local` y GitHub Pages)
Si al abrir **MiBarcito** en `⚙️ Configuración -> 💾 Respaldo & Nube` ves el aviso:
> *"ℹ️ Las variables `VITE_FIREBASE_*` no están definidas en este entorno. MiBarcito está operando 100% sobre `IndexedDB` local."*

Significa que la app está funcionando en **modo seguro local** porque aún no le pasaste los 4 identificadores públicos de tu app web de Firebase. Para obtenerlos y configurarlos:

1. Entrá a **Configuración del Proyecto en Firebase**:
   - **Dirección**: https://console.firebase.google.com/project/mibarcito-app/settings/general
2. Bajá hasta el final a la sección **"Tus apps" (Your apps)**:
   - Si todavía dice *"No hay apps en tu proyecto"*, hacé clic en el botón redondo **`</>` (Web)**, ponele de apodo `MiBarcito PWA` (sin tildar Firebase Hosting) y hacé clic en **Registrar app**.
3. Copiá los 4 valores que te muestra el bloque `firebaseConfig`:
   - `apiKey` $\rightarrow$ **`VITE_FIREBASE_API_KEY`**
   - `authDomain` $\rightarrow$ **`VITE_FIREBASE_AUTH_DOMAIN`** (`mibarcito-app.firebaseapp.com`)
   - `projectId` $\rightarrow$ **`VITE_FIREBASE_PROJECT_ID`** (`mibarcito-app`)
   - `appId` $\rightarrow$ **`VITE_FIREBASE_APP_ID`**
4. **Para probar en tu entorno de desarrollo local (`npm run dev`)**:
   - Creá o editá el archivo `.env.local` en la raíz del repositorio (basado en `.env.example`, ignorado por Git):
     ```env
     VITE_FIREBASE_API_KEY="AIzaSy..."
     VITE_FIREBASE_AUTH_DOMAIN="mibarcito-app.firebaseapp.com"
     VITE_FIREBASE_PROJECT_ID="mibarcito-app"
     VITE_FIREBASE_APP_ID="1:...:web:..."
     ```
   - Reiniciá `npm run dev` (Vite recarga las variables `.env.local` al iniciar el servidor).
5. **Para dejarlo activo en producción (GitHub Pages)**:
   - **Dirección en GitHub**: https://github.com/augustohassel/MiBarcito/settings/variables/actions
   - Hacé clic en **"New repository variable"** y creá esas mismas 4 variables (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`).
   - En el próximo despliegue de GitHub Actions (`deploy.yml`), la PWA publicada ya saldrá conectada a tu nube.

---

### 5. Cómo Iniciar Sesión, Migrar las Botellas del Celular y Cerrar Sesión en la App
1. **Iniciar sesión**:
   - Podés tocar el botón **`☁️ Conectar Google`** en la barra superior (Header) o ir a **`⚙️ Configuración -> 💾 Respaldo & Nube`** y tocar **`🔐 Iniciar sesión con Google`**.
2. **Migración automática y manual de tus botellas**:
   - Al iniciar sesión, MiBarcito **nunca borra tu `IndexedDB` local**: fusiona automáticamente todas tus botellas, categorías, recetas de autor, favoritos e insumos locales hacia `users/{uid}/...` en Firestore.
   - Además, en **`⚙️ Configuración -> 💾 Respaldo & Nube`** tenés:
     - El contador en vivo de cuántas botellas hay guardadas en el dispositivo local.
     - El botón **`☁️ Migrar / Subir datos de este dispositivo a mi cuenta`** para forzar la sincronización cuando quieras.
     - Los botones **`📥 Descargar backup JSON`** y **`📤 Importar backup JSON`** para guardar un archivo `.json` de resguardo en tu teléfono o PC.
3. **Cerrar sesión (Desloguearse)**:
   - Cuando estás conectado, en **`⚙️ Configuración -> 💾 Respaldo & Nube`** verás tu foto de perfil, nombre, correo, el cartel verde **`Nube Activa`** y el botón **`Cerrar sesión`**.
   - Al tocar **`Cerrar sesión`**, se cierra el vínculo con Google Cloud y la app vuelve a trabajar sobre el almacenamiento local del dispositivo sin perder tus datos.

---

### 6. Control de Costo $0.00 USD/mes (Cuotas del Free Tier)
- **Dirección de Consumo de Firestore**: https://console.firebase.google.com/project/mibarcito-app/firestore/databases/-default-/usage
- **Dirección de Facturación en GCP**: https://console.cloud.google.com/billing?project=mibarcito-app
- **Qué tenés que ver**:
  - El gráfico de lecturas, escrituras y almacenamiento diario.
  - Recordá que el **Free Tier perpetuo de Firestore** incluye gratis todos los días:
    - **50.000 lecturas por día**
    - **20.000 escrituras por día**
    - **20.000 borrados por día**
    - **1 GiB de almacenamiento total**
  - Con uso personal en celular y PC vas a estar consumiendo menos del **0.5%** de la cuota gratuita diaria ($0.00 USD/mes).

---

### 7. Infraestructura de Terraform y Conexión OIDC con GitHub Actions
Si querés auditar los recursos internos de GCP que mantienen la automatización:

- **APIs activas del proyecto**:
  - https://console.cloud.google.com/apis/dashboard?project=mibarcito-app
  - *Verás activas*: `Cloud Firestore API`, `Identity Toolkit API`, `Firebase Rules API`, `Firebase Management API`, `IAM Service Account Credentials API`.
- **Bucket donde vive el estado de Terraform (`terraform.tfstate`)**:
  - https://console.cloud.google.com/storage/browser/mibarcito-app-tfstate?project=mibarcito-app
  - *Verás la carpeta*: `terraform/state/default.tfstate`.
- **Service Account de GitHub Actions**:
  - https://console.cloud.google.com/iam-admin/serviceaccounts?project=mibarcito-app
  - *Verás la cuenta*: `github-actions-tf@mibarcito-app.iam.gserviceaccount.com`.
- **Federación de Identidad (Workload Identity Pool OIDC sin claves JSON)**:
  - https://console.cloud.google.com/iam-admin/workload-identity-pools?project=mibarcito-app
  - *Verás el pool*: `github-actions-pool` y adentro el proveedor `github-oidc` restringido exclusivamente al repositorio `augustohassel/MiBarcito`.

