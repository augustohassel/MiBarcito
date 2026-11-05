variable "project_id" {
  description = "ID del proyecto de Google Cloud Platform (ej. mibarcito-app)."
  type        = string
  default     = "mibarcito-app"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "El project_id debe tener entre 6 y 30 caracteres (letras minúsculas, números y guiones)."
  }
}

variable "region" {
  description = "Región o multi-región para Cloud Firestore y recursos de GCP. 'nam5' (multi-región US) o 'us-central1' son compatibles con el Free Tier perpetuo de Firestore."
  type        = string
  default     = "nam5"
}

variable "authorized_domains" {
  description = "Lista de dominios autorizados para OAuth en Identity Platform / Firebase Auth."
  type        = list(string)
  default = [
    "localhost",
    "127.0.0.1",
    "augustohassel.github.io"
  ]
}

variable "allowed_user_email" {
  description = "Correo electrónico opcional del propietario único del bar para restringir adicionalmente las reglas de Firestore (dejar vacío '' para permitir cualquier usuario autenticado en su propio espacio /users/{uid})."
  type        = string
  default     = ""
}

variable "github_repository" {
  description = "Repositorio de GitHub (owner/repo) autorizado mediante Workload Identity Federation (OIDC) para ejecutar Terraform en CI/CD."
  type        = string
  default     = "augustohassel/MiBarcito"
}


