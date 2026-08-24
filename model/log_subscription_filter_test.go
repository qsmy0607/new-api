package model

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func insertSubscriptionFilterLogs(t *testing.T) {
	t.Helper()
	now := time.Now().Unix()
	logs := []Log{
		{UserId: 1, CreatedAt: now, Type: LogTypeConsume, Content: "subscription-user-1", Quota: 100, Other: common.MapToJsonStr(map[string]interface{}{"billing_source": "subscription"})},
		{UserId: 1, CreatedAt: now, Type: LogTypeConsume, Content: "wallet-user-1", Quota: 200, Other: common.MapToJsonStr(map[string]interface{}{"billing_source": "wallet"})},
		{UserId: 2, CreatedAt: now, Type: LogTypeConsume, Content: "subscription-user-2", Quota: 300, Other: common.MapToJsonStr(map[string]interface{}{"billing_source": "subscription"})},
		{UserId: 1, CreatedAt: now, Type: LogTypeError, Content: "subscription-error", Other: common.MapToJsonStr(map[string]interface{}{"billing_source": "subscription"})},
	}
	require.NoError(t, LOG_DB.Create(&logs).Error)
}

func TestAllLogsSubscriptionFilterReturnsOnlySubscriptionConsumption(t *testing.T) {
	truncateTables(t)
	insertSubscriptionFilterLogs(t)

	allLogs, allTotal, err := GetAllLogs(LogTypeSubscription, 0, 0, "", "", "", 0, 20, 0, "", "", "")
	require.NoError(t, err)
	assert.EqualValues(t, 2, allTotal)
	require.Len(t, allLogs, 2)
	assert.ElementsMatch(t, []string{"subscription-user-1", "subscription-user-2"}, []string{allLogs[0].Content, allLogs[1].Content})
}

func TestUserLogsSubscriptionFilterReturnsOnlyOwnedSubscriptionConsumption(t *testing.T) {
	truncateTables(t)
	insertSubscriptionFilterLogs(t)

	userLogs, userTotal, err := GetUserLogs(1, LogTypeSubscription, 0, 0, "", "", 0, 20, "", "", "")
	require.NoError(t, err)
	assert.EqualValues(t, 1, userTotal)
	require.Len(t, userLogs, 1)
	assert.Equal(t, "subscription-user-1", userLogs[0].Content)
}

func TestSubscriptionLogFilterLimitsUsageStatistics(t *testing.T) {
	truncateTables(t)
	insertSubscriptionFilterLogs(t)

	stat, err := SumUsedQuota(LogTypeSubscription, 0, 0, "", "", "", 0, "")
	require.NoError(t, err)
	assert.Equal(t, 400, stat.Quota)
	assert.Equal(t, 2, stat.Rpm)
}
