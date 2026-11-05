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

### 3. Autenticación con Google y Dominios Autorizados
- **Dirección de Proveedores**: https://console.firebase.google.com/project/mibarcito-app/authentication/providers
- **Dirección de Dominios Autorizados**: https://console.firebase.google.com/project/mibarcito-app/authentication/settings
- **Dirección de Usuarios Conectados**: https://console.firebase.google.com/project/mibarcito-app/authentication/users
- **Qué tenés que verificar**:
  1. En **Sign-in method (`providers`)**: Asegurate de que el proveedor **Google** diga **"Habilitado" (Enabled)**. *(Si es la primera vez que entrás después del `terraform apply`, hacé clic en Google, activalo, elegí tu email de soporte en el desplegable y dale a Guardar).*
  2. En **Settings -> Dominios autorizados (`settings`)**: Deberías ver cargados por Terraform:
     - `localhost`
     - `127.0.0.1`
     - `augustohassel.github.io`
     - `mibarcito-app.firebaseapp.com`
     - `mibarcito-app.web.app`
  3. En **Users (`users`)**: Apenas inicies sesión desde MiBarcito en tu celular o PC, aparecerá tu correo de Google, la fecha de último acceso y tu **UID de usuario** (el mismo que da nombre a tu carpeta en Firestore).

---

### 4. Obtener las 4 Variables `VITE_FIREBASE_*` para conectar GitHub Pages
Para que la PWA publicada en `https://augustohassel.github.io/MiBarcito/` sepa conectarse a tu proyecto `mibarcito-app`:

1. Entrá a **Configuración del Proyecto en Firebase**:
   - **Dirección**: https://console.firebase.google.com/project/mibarcito-app/settings/general
2. Bajá hasta la sección **"Tus apps" (Your apps)**:
   - Si todavía no hay ninguna app web creada, hacé clic en el ícono **`</>` (Web)**, ponele de apodo `MiBarcito PWA` (sin tildar Firebase Hosting) y hacé clic en **Registrar app**.
3. Copiá los 4 valores que te muestra el bloque `firebaseConfig`:
   - `apiKey` $\rightarrow$ **`VITE_FIREBASE_API_KEY`**
   - `authDomain` $\rightarrow$ **`VITE_FIREBASE_AUTH_DOMAIN`** (normalmente `mibarcito-app.firebaseapp.com`)
   - `projectId` $\rightarrow$ **`VITE_FIREBASE_PROJECT_ID`** (`mibarcito-app`)
   - `appId` $\rightarrow$ **`VITE_FIREBASE_APP_ID`**
4. Cargalos en tu repositorio de GitHub:
   - **Dirección en GitHub**: https://github.com/augustohassel/MiBarcito/settings/variables/actions
   - Hacé clic en **"New repository variable"** y creá esas 4 variables (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`).
   - En el próximo despliegue de GitHub Actions (`deploy.yml`), la app ya saldrá conectada a tu nube.

---

### 5. Control de Costo $0.00 USD/mes (Cuotas del Free Tier)
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

### 6. Infraestructura de Terraform y Conexión OIDC con GitHub Actions
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
