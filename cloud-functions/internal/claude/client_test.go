package claude_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/nakata/release-digest/cloud-functions/internal/claude"
)

func TestSummarize(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-api-key") != "test-key" {
			t.Error("missing or wrong api key")
		}
		if r.Header.Get("anthropic-version") == "" {
			t.Error("missing anthropic-version header")
		}

		resp := map[string]any{
			"content": []map[string]any{
				{"type": "text", "text": "- 新機能A\n- 修正B"},
			},
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := claude.NewClient("test-key", claude.WithBaseURL(server.URL))
	result, err := client.Summarize(context.Background(), "Release v1.0.0: Added feature A, fixed B")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == "" {
		t.Error("expected non-empty summary")
	}
}

func TestSummarize_APIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := claude.NewClient("test-key", claude.WithBaseURL(server.URL))
	_, err := client.Summarize(context.Background(), "some text")

	if err == nil {
		t.Error("expected error for 500 response")
	}
}
