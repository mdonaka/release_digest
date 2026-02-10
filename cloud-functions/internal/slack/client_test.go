package slack_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/nakata/release-digest/cloud-functions/internal/slack"
)

func TestPostThreadReply(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer test-token" {
			t.Error("missing or wrong auth header")
		}

		var body map[string]string
		json.NewDecoder(r.Body).Decode(&body)

		if body["channel"] != "C123" {
			t.Errorf("expected channel C123, got %s", body["channel"])
		}
		if body["thread_ts"] != "1234.5678" {
			t.Errorf("expected thread_ts 1234.5678, got %s", body["thread_ts"])
		}
		if body["text"] == "" {
			t.Error("expected non-empty text")
		}

		json.NewEncoder(w).Encode(map[string]any{"ok": true})
	}))
	defer server.Close()

	client := slack.NewClient("test-token", slack.WithBaseURL(server.URL))
	err := client.PostThreadReply(context.Background(), "C123", "1234.5678", "要約テスト")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestPostThreadReply_APIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{"ok": false, "error": "channel_not_found"})
	}))
	defer server.Close()

	client := slack.NewClient("test-token", slack.WithBaseURL(server.URL))
	err := client.PostThreadReply(context.Background(), "C999", "1234.5678", "test")

	if err == nil {
		t.Error("expected error for failed API response")
	}
}
