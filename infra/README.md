# Infraestructura de MiBarcito en Google Cloud Platform (`infra/`)

Este directorio contiene la definición de Infraestructura como Código (**Terraform**) para aprovisionar de forma reproducible, segura y dentro del **Free Tier perpetuo ($0.00 USD/mes)** los servicios de Google Cloud Platform (GCP) requeridos por **MiBarcito**:

1. **Activación declarativa de APIs** (`google_project_service`):
   - `firestore.googleapis.com` (Cloud Firestore)
   - `identitytoolkit.googleapis.com` (Identity Platform / Firebase Auth)
   - `firebaserules.googleapis.com` (Firebase Security Rules API)
   - `firebase.googleapis.com` (Firebase Management API)
2. **Cloud Firestore en modo Native** (`google_firestore_database`):
   - Base de datos `(default)` configurada por defecto en `nam5` (multi-región US) o `us-central1`, elegibles para el nivel gratuito perpetuo (1 GiB de almacenamiento, 50.000 lecturas/día, 20.000 escrituras/día, 20.000 borrados/día).
3. **Identity Platform / Firebase Auth** (`google_identity_platform_config`):
   - Configuración de dominios autorizados para OAuth (`localhost`, `127.0.0.1`, `augustohassel.github.io` y los dominios de Firebase del proyecto).
4. **Firestore Security Rules** (`google_firebaserules_ruleset` y `google_firebaserules_release`):
   - Despliegue declarativo de `firestore.rules` con denegación por defecto y aislamiento estricto bajo `/users/{userId}/{document=**}` verificando `request.auth != null && request.auth.uid == userId` (y soporte opcional para restringir a un único email propietario mediante `allowed_user_email`).
5. **Backend Remoto en GCS y Despliegue Continuo en GitHub Actions (OIDC)**:
   - Estado remoto almacenado en el bucket `gs://mibarcito-app-tfstate` (con versionado activo y acceso público bloqueado).
   - **Workload Identity Federation (`github-actions-pool` / `github-oidc`)** y Service Account (`github-actions-tf@mibarcito-app.iam.gserviceaccount.com`) que permiten al workflow `.github/workflows/terraform-validate.yml` ejecutar `terraform plan` en PRs/ramas y **`terraform apply` automáticamente al mergear en `master`**, sin almacenar claves JSON de larga duración en GitHub.

---

## Requisitos Previos

- **Terraform** `>= 1.17.0`
- **Google Cloud SDK (`gcloud`)** instalado.
- Una cuenta de Google con un proyecto de GCP creado (y facturación vinculada si GCP la solicita para activar Identity Platform, operando siempre dentro de las cuotas gratuitas).

---

## Guía Paso a Paso

### 1. Crear el proyecto en GCP y autenticarse (sin descargar claves JSON)

La forma recomendada y más segura es usar **Application Default Credentials (ADC)** desde tu terminal local, sin descargar archivos `.json` de cuentas de servicio:

```bash
# 1. Iniciar sesión en Google Cloud CLI
gcloud auth login

# 2. (Opcional) Crear el proyecto si aún no existe
gcloud projects create mibarcito-app --name="MiBarcito"

# 3. Configurar el proyecto activo y generar credenciales ADC para Terraform
gcloud config set project mibarcito-app
gcloud auth application-default login
gcloud auth application-default set-quota-project mibarcito-app
```

### 2. Configurar tus variables locales (`terraform.tfvars`)

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

Edita `infra/terraform.tfvars` (este archivo está ignorado por `.gitignore` y **nunca se sube a Git**):

```hcl
project_id = "mibarcito-app"
region     = "nam5"

authorized_domains = [
  "localhost",
  "127.0.0.1",
  "augustohassel.github.io"
]

# Opcional: tu email de Google para que nadie más pueda escribir en Firestore aunque inicie sesión
allowed_user_email = "tu-correo@gmail.com"
```

### 3. Inicializar, Validar, Previsualizar y Aplicar

```bash
# Inicializar providers
terraform init

# Verificar formato y validez sintáctica
terraform fmt -check
terraform validate

# Previsualizar el plan de ejecución
terraform plan

# Aplicar los cambios en GCP
terraform apply
```

### 4. Habilitar el Proveedor de Google OAuth en la Consola

Una vez ejecutado `terraform apply`:
1. Ingresa a [Firebase Console](https://console.firebase.google.com/) → selecciona tu proyecto → **Authentication** → **Sign-in method**.
2. Habilita el proveedor **Google** (seleccionando tu correo de soporte del proyecto), ya que Google exige configurar el correo de consentimiento OAuth de forma interactiva o con credenciales OAuth específicas.
3. En **Configuración del proyecto** → **Tus apps**, registra una **App Web (`</>`)** para obtener los identificadores públicos (`apiKey`, `appId`, `projectId`, `authDomain`) que se utilizarán en las variables `VITE_FIREBASE_*` del frontend (Issue #41).

> 📌 **¿Dónde mirar en GCP/Firebase que todo funcione?**: Consulta la [Guía APB de Verificación y Monitoreo en GCP (`docs/guia-verificacion-gcp.md`)](../docs/guia-verificacion-gcp.md) con todos los enlaces directos a tu proyecto `mibarcito-app`.

---

## (Opcional) Configuración de Backend Remoto en Google Cloud Storage (GCS)

Por defecto, Terraform guarda el estado localmente en `infra/terraform.tfstate` (excluido en `.gitignore`). Si deseas persistir el estado en un bucket de GCS (también dentro del Free Tier de 5 GB en `us-central1`):

1. Crea el bucket en tu proyecto:
   ```bash
   gcloud storage buckets create gs://mibarcito-app-tfstate --location=us-central1 --uniform-bucket-level-access
   ```
2. Añade un bloque `backend "gcs"` dentro de `terraform {}` en `infra/versions.tf`:
   ```hcl
   backend "gcs" {
     bucket = "mibarcito-app-tfstate"
     prefix = "terraform/state"
   }
   ```
3. Ejecuta `terraform init -migrate-state`.

