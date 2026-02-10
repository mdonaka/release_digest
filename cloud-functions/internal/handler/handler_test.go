package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/nakata/release-digest/cloud-functions/internal/handler"
)

func TestHandleDigest_Success(t *testing.T) {
	// Mock Claude API
	claudeServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := map[string]any{
			"content": []map[string]any{
				{"type": "text", "text": "- 要約テスト"},
			},
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer claudeServer.Close()

	// Mock Slack API
	slackServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{"ok": true})
	}))
	defer slackServer.Close()

	h := handler.New(handler.Config{
		AnthropicAPIKey: "test-key",
		SlackBotToken:   "test-token",
		ClaudeBaseURL:   claudeServer.URL,
		SlackBaseURL:    slackServer.URL,
	})

	body := map[string]string{
		"text":      "Release v1.0.0",
		"channel":   "C123",
		"thread_ts": "1234.5678",
	}
	b, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.HandleDigest(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

func TestHandleDigest_InvalidJSON(t *testing.T) {
	h := handler.New(handler.Config{
		AnthropicAPIKey: "test-key",
		SlackBotToken:   "test-token",
	})

	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader([]byte("invalid")))
	rec := httptest.NewRecorder()

	h.HandleDigest(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
}

func TestHandleDigest_MissingFields(t *testing.T) {
	h := handler.New(handler.Config{
		AnthropicAPIKey: "test-key",
		SlackBotToken:   "test-token",
	})

	body := map[string]string{"text": ""}
	b, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.HandleDigest(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
}
