package ratio_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConfiguredCompletionRatioOverridesBackendDefault(t *testing.T) {
	originalRatios := completionRatioMap.ReadAll()
	t.Cleanup(func() {
		completionRatioMap.Clear()
		completionRatioMap.AddAll(originalRatios)
	})

	require.NoError(t, UpdateCompletionRatioByJSONString(`{"gpt-5":1.5}`))

	assert.Equal(t, 1.5, GetCompletionRatio("gpt-5"))
	assert.Equal(t, CompletionRatioInfo{Ratio: 1.5, Locked: false}, GetCompletionRatioInfo("gpt-5"))
}
