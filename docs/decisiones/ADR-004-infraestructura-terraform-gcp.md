# ADR-004: Infraestructura de GCP como Código con Terraform In-Repo y Arquitectura Serverless Costo $0

- **Fecha**: 2026-11-05
- **Estado**: Aceptada
- **Issue Asociado**: [#40](https://github.com/augustohassel/MiBarcito/issues/40) (Padre: [#39](https://github.com/augustohassel/MiBarcito/issues/39))
- **Decisores**: @augustohassel (Propietario), Agente Antigravity

---

## 1. Contexto y Problema

En [`ADR-001`](file:///workspaces/MiBarcito/docs/decisiones/ADR-001-stack-tecnologico.md) se estableció que **MiBarcito** nacería como una PWA *Local-First* sobre `IndexedDB` desacoplada mediante el Patrón Repositorio (`IInventoryRepository`, `ICategoriaRepository`, `IRecetaRepository`, `IInsumoRepository`), previendo una futura transición hacia Google Cloud Platform (GCP).

Al abordar la épica [#39](https://github.com/augustohassel/MiBarcito/issues/39) para dotar a la aplicación de inicio de sesión con cuenta de Google y sincronización multi-dispositivo en la nube, surgieron dos decisiones arquitectónicas clave:
1. **Arquitectura Cloud de Costo $0.00 USD/mes**: Cómo respaldar y sincronizar el inventario personal en GCP sin incurrir en costos mensuales por servidores o bases de datos relacionales encendidas 24/7, ni perder la gratuidad e inmediatez del hosting estático actual en **GitHub Pages**.
2. **Estrategia de Infraestructura como Código (IaC)**: Dónde y cómo gestionar el aprovisionamiento de recursos de GCP y las reglas de seguridad (repositorio separado vs. directorio `infra/` dentro del mismo repositorio con Terraform).

---

## 2. Alternativas Evaluadas

### A. Arquitectura de Persistencia y Autenticación en GCP
1. **Alternativa A1 (API Backend en Cloud Run + Cloud SQL PostgreSQL)**:
   - *Ventajas*: Control de lógica de negocio en un backend tradicional REST/gRPC.
   - *Desventajas*: Cloud SQL no posee nivel gratuito perpetuo (implica costo mensual fijo), y requiere mantener y desplegar imágenes Docker adicionales para un CRUD personal de baja concurrencia.
2. **Alternativa A2 (Serverless Directo: GitHub Pages + Cloud Firestore Native + Identity Platform / Firebase Auth + Firestore Security Rules)**:
   - *Ventajas*:
     - **Costo $0 perpetuo**: Cloud Firestore en modo Native ofrece 1 GiB de almacenamiento, 50.000 lecturas/día, 20.000 escrituras/día y 20.000 borrados/día sin cargo; Identity Platform / Firebase Auth ofrece hasta 50.000 MAU gratuitos en proveedores OAuth como Google; GitHub Pages mantiene el hosting estático gratuito e ilimitado.
     - **Caché Offline Nativo y Sincronización**: El SDK modular de Firestore en el cliente gestiona colas offline y sincronización automática con el servidor.
     - **Seguridad declarativa en el servidor**: Las `firestore.rules` validan criptográficamente el token JWT emitido por Google (`request.auth.uid == userId`), impidiendo accesos no autorizados sin necesidad de un backend intermedio.
   - *Elección*: **Alternativa A2**, actualizando y simplificando la proyección original de `ADR-001`.

### B. Ubicación y Herramienta de Infraestructura como Código (IaC)
1. **Alternativa B1 (Configuración manual ClickOps en la consola de GCP/Firebase)**:
   - *Descartada*: Propensa a errores manuales, sin trazabilidad en Git ni capacidad de auditar las reglas de seguridad de Firestore en Pull Requests.
2. **Alternativa B2 (Repositorio separado `MiBarcito-infra`)**:
   - *Descartada*: Desincroniza la evolución del modelo de datos en TypeScript (`src/domain/`) respecto de las reglas de seguridad (`firestore.rules`) y obliga a mantener dos pipelines y contextos separados para un proyecto personal compacto.
3. **Alternativa B3 (Terraform *in-repo* bajo el directorio `infra/`)**:
   - *Ventajas*: Cohesión atómica entre las colecciones consumidas por los repositorios de `src/infrastructure/` y las reglas de seguridad en `infra/firestore.rules`, validación continua en un workflow dedicado de GitHub Actions (`terraform-validate.yml`) y un único punto de verdad.
   - *Elección*: **Alternativa B3 (Terraform *in-repo* en `infra/`)**.

---

## 3. Decisión Adoptada

1. **Estructura Declarativa en `infra/`**:
   - Se utilizan los providers oficiales `hashicorp/google` y `hashicorp/google-beta` (`~> 8.10`) sobre Terraform `>= 1.17.0`.
   - Se activan declarativamente las APIs `firestore.googleapis.com`, `identitytoolkit.googleapis.com`, `firebaserules.googleapis.com` y `firebase.googleapis.com` mediante recursos `google_project_service` con `disable_on_destroy = false`.
   - Todos los recursos dependientes (`google_firebase_project`, `google_firestore_database`, `google_identity_platform_config`, `google_firebaserules_ruleset` y `google_firebaserules_release`) declaran bloques `depends_on` explícitos hacia los `google_project_service` correspondientes para evitar condiciones de carrera (`Error 403`) al aprovisionar un proyecto de GCP recién creado.
2. **Modelo de Seguridad y Aislamiento por Propietario (`infra/firestore.rules`)**:
   - Se deniega por defecto toda lectura y escritura en la raíz de la base de datos (`match /{document=**} { allow read, write: if false; }`).
   - Se habilita acceso exclusivamente a la jerarquía `/users/{userId}/{document=**}` cuando el usuario está autenticado (`request.auth != null`) y su identificador coincide exactamente con el segmento de la ruta (`request.auth.uid == userId`).
   - Se soporta opcionalmente la variable `allowed_user_email` para restringir las reglas a una única dirección de correo verificada del propietario.
3. **Prevención de Fuga de Secretos y Estado**:
   - Se blindan en `.gitignore` todos los archivos de estado (`*.tfstate*`), directorios `.terraform/`, variables locales (`*.tfvars` excepto `!*.tfvars.example`) y credenciales JSON de GCP.
4. **Validación y Despliegue Continuo (CI/CD) en GitHub Actions con OIDC y Backend en GCS**:
   - El estado de Terraform se almacena remotamente en el bucket `gs://mibarcito-app-tfstate` (en `us-central1`, dentro del Free Tier de 5 GB de Cloud Storage) con versionado habilitado.
   - Se aprovisiona una relación de confianza mediante **Workload Identity Federation (OIDC)** (`google_iam_workload_identity_pool` + `google_iam_workload_identity_pool_provider`) restringida a `assertion.repository == 'augustohassel/MiBarcito'`, sin descargar ni almacenar claves JSON privadas en GitHub Secrets.
   - El workflow `.github/workflows/terraform-validate.yml` ejecuta `terraform fmt -check`, `terraform validate` y `terraform plan` en ramas y Pull Requests, y ejecuta **`terraform apply -auto-approve` automáticamente al integrarse cambios en `master`**, sin interferir con el workflow de despliegue a GitHub Pages (`deploy.yml`).

---

## 4. Consecuencias y Trade-offs

- **Positivas**:
  - Infraestructura 100% reproducible, auditable en código y con costo operativo mensual de **$0.00 USD**.
  - Las reglas de seguridad de Firestore quedan versionadas junto con el código de la aplicación, garantizando que ningún tercero pueda leer o alterar el inventario personal.
- **Limitaciones aceptadas y Mitigaciones**:
  - La activación final del consentimiento OAuth de Google requiere un paso único en la consola de Firebase/GCP por políticas de seguridad de Google OAuth, el cual queda documentado paso a paso en [`infra/README.md`](file:///workspaces/MiBarcito/infra/README.md).

