package service

import (
	"fmt"
	"testing"

	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeVideoPollingResultUnfinishedStatuses(t *testing.T) {
	tests := []struct {
		status string
		want   model.TaskStatus
	}{
		{status: "unknown", want: model.TaskStatusInProgress},
		{status: "queued", want: model.TaskStatusQueued},
		{status: "pending", want: model.TaskStatusQueued},
		{status: "processing", want: model.TaskStatusInProgress},
		{status: "in_progress", want: model.TaskStatusInProgress},
		{status: "running", want: model.TaskStatusInProgress},
	}

	for _, test := range tests {
		t.Run(test.status, func(t *testing.T) {
			body := []byte(fmt.Sprintf(`{"status":%q,"progress":0,"metadata":{"url":""}}`, test.status))
			result, recognized := normalizeVideoPollingResult(body, &relaycommon.TaskInfo{})

			require.True(t, recognized)
			assert.Equal(t, test.want, model.TaskStatus(result.Status))
		})
	}
}

func TestNormalizeVideoPollingResultCompletionSignals(t *testing.T) {
	tests := []struct {
		name    string
		body    string
		wantURL string
	}{
		{name: "progress number", body: `{"status":"unknown","progress":100}`},
		{name: "progress string", body: `{"status":"running","progress":"100%"}`},
		{name: "completed status", body: `{"status":"completed","progress":0}`},
		{name: "metadata url", body: `{"status":"unknown","progress":0,"metadata":{"url":"https://example.com/video.mp4"}}`, wantURL: "https://example.com/video.mp4"},
		{name: "metadata video url", body: `{"status":"processing","progress":0,"metadata":{"video_url":"https://example.com/video-2.mp4"}}`, wantURL: "https://example.com/video-2.mp4"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			result, recognized := normalizeVideoPollingResult([]byte(test.body), &relaycommon.TaskInfo{})

			require.True(t, recognized)
			assert.Equal(t, model.TaskStatus(model.TaskStatusSuccess), model.TaskStatus(result.Status))
			assert.Equal(t, test.wantURL, result.Url)
		})
	}
}

func TestNormalizeVideoPollingResultExplicitFailureStatuses(t *testing.T) {
	for _, status := range []string{"failed", "error", "canceled", "cancelled", "rejected", "expired"} {
		t.Run(status, func(t *testing.T) {
			body := []byte(fmt.Sprintf(`{"status":%q,"progress":0}`, status))
			result, recognized := normalizeVideoPollingResult(body, &relaycommon.TaskInfo{})

			require.True(t, recognized)
			assert.Equal(t, model.TaskStatus(model.TaskStatusFailure), model.TaskStatus(result.Status))
		})
	}
}

func TestNormalizeVideoPollingResultErrorString(t *testing.T) {
	result, recognized := normalizeVideoPollingResult(
		[]byte(`{"status":"error","error":"upstream rejected the task"}`),
		&relaycommon.TaskInfo{},
	)

	require.True(t, recognized)
	assert.Equal(t, model.TaskStatus(model.TaskStatusFailure), model.TaskStatus(result.Status))
	assert.Equal(t, "upstream rejected the task", result.Reason)
}

func TestNormalizeVideoPollingResultUnrecognizedStatusKeepsPolling(t *testing.T) {
	result, recognized := normalizeVideoPollingResult(
		[]byte(`{"status":"provider_warming_up","progress":0}`),
		&relaycommon.TaskInfo{},
	)

	require.True(t, recognized)
	assert.Equal(t, model.TaskStatus(model.TaskStatusInProgress), model.TaskStatus(result.Status))
}
