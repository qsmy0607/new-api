package dto

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserSettingRecordIpLogDefaultsEnabledAndPreservesExplicitFalse(t *testing.T) {
	defaultSetting := DefaultUserSetting()
	require.NoError(t, json.Unmarshal([]byte(`{}`), &defaultSetting))
	assert.True(t, defaultSetting.RecordIpLog)

	disabledSetting := DefaultUserSetting()
	require.NoError(t, json.Unmarshal([]byte(`{"record_ip_log":false}`), &disabledSetting))
	assert.False(t, disabledSetting.RecordIpLog)

	encoded, err := json.Marshal(disabledSetting)
	require.NoError(t, err)
	assert.Contains(t, string(encoded), `"record_ip_log":false`)
}
