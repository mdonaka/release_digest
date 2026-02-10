resource "google_secret_manager_secret" "anthropic_api_key" {
  secret_id = "release-digest-anthropic-api-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "anthropic_api_key" {
  secret      = google_secret_manager_secret.anthropic_api_key.id
  secret_data = var.anthropic_api_key
}

resource "google_secret_manager_secret" "slack_bot_token" {
  secret_id = "release-digest-slack-bot-token"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "slack_bot_token" {
  secret      = google_secret_manager_secret.slack_bot_token.id
  secret_data = var.slack_bot_token
}
