terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Cloud Function実行用サービスアカウント
resource "google_service_account" "cf_runner" {
  account_id   = "release-digest-cf"
  display_name = "Release Digest Cloud Function"
}

# Deno Slack App呼び出し用サービスアカウント
resource "google_service_account" "deno_invoker" {
  account_id   = "release-digest-invoker"
  display_name = "Release Digest Deno Invoker"
}

# CFソースコード用バケット
resource "google_storage_bucket" "cf_source" {
  name     = "${var.project_id}-release-digest-source"
  location = var.region

  uniform_bucket_level_access = true
}

# Cloud Function
resource "google_cloudfunctions2_function" "digest" {
  name     = "release-digest"
  location = var.region

  build_config {
    runtime     = "go123"
    entry_point = "main"
    source {
      storage_source {
        bucket = google_storage_bucket.cf_source.name
        object = "source.zip"
      }
    }
  }

  service_config {
    max_instance_count = 1
    min_instance_count = 0
    available_memory   = "256M"
    timeout_seconds    = 60

    service_account_email = google_service_account.cf_runner.email

    secret_environment_variables {
      key        = "ANTHROPIC_API_KEY"
      project_id = var.project_id
      secret     = google_secret_manager_secret.anthropic_api_key.secret_id
      version    = "latest"
    }

    secret_environment_variables {
      key        = "SLACK_BOT_TOKEN"
      project_id = var.project_id
      secret     = google_secret_manager_secret.slack_bot_token.secret_id
      version    = "latest"
    }
  }
}

# Deno用SAにinvoker権限を付与
resource "google_cloud_run_service_iam_member" "invoker" {
  location = google_cloudfunctions2_function.digest.location
  service  = google_cloudfunctions2_function.digest.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.deno_invoker.email}"
}

# CF実行用SAにSecret Managerアクセス権限
resource "google_secret_manager_secret_iam_member" "cf_anthropic" {
  secret_id = google_secret_manager_secret.anthropic_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cf_runner.email}"
}

resource "google_secret_manager_secret_iam_member" "cf_slack" {
  secret_id = google_secret_manager_secret.slack_bot_token.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cf_runner.email}"
}
