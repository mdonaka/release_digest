package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/nakata/release-digest/cloud-functions/internal/claude"
	"github.com/nakata/release-digest/cloud-functions/internal/slack"
)

type Config struct {
	AnthropicAPIKey string
	SlackBotToken   string
	ClaudeBaseURL   string
	SlackBaseURL    string
}

type Handler struct {
	claude *claude.Client
	slack  *slack.Client
}

func New(cfg Config) *Handler {
	var claudeOpts []claude.Option
	if cfg.ClaudeBaseURL != "" {
		claudeOpts = append(claudeOpts, claude.WithBaseURL(cfg.ClaudeBaseURL))
	}

	var slackOpts []slack.Option
	if cfg.SlackBaseURL != "" {
		slackOpts = append(slackOpts, slack.WithBaseURL(cfg.SlackBaseURL))
	}

	return &Handler{
		claude: claude.NewClient(cfg.AnthropicAPIKey, claudeOpts...),
		slack:  slack.NewClient(cfg.SlackBotToken, slackOpts...),
	}
}

type digestRequest struct {
	Text     string `json:"text"`
	Channel  string `json:"channel"`
	ThreadTS string `json:"thread_ts"`
}

func (h *Handler) HandleDigest(w http.ResponseWriter, r *http.Request) {
	var req digestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if req.Text == "" || req.Channel == "" || req.ThreadTS == "" {
		http.Error(w, "missing required fields", http.StatusBadRequest)
		return
	}

	summary, err := h.claude.Summarize(r.Context(), req.Text)
	if err != nil {
		log.Printf("claude summarize error: %v", err)
		http.Error(w, "summarize failed", http.StatusInternalServerError)
		return
	}

	if err := h.slack.PostThreadReply(r.Context(), req.Channel, req.ThreadTS, summary); err != nil {
		log.Printf("slack reply error: %v", err)
		http.Error(w, "slack reply failed", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
