package service

import (
	"fmt"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seedBillingSubscriptionPlan(t *testing.T, id int) {
	t.Helper()
	require.NoError(t, model.DB.Create(&model.SubscriptionPlan{
		Id:            id,
		Title:         fmt.Sprintf("Billing Plan %d", id),
		Currency:      "USD",
		DurationUnit:  model.SubscriptionDurationMonth,
		DurationValue: 1,
		Enabled:       true,
		TotalAmount:   100,
	}).Error)
}

func seedBillingSubscription(t *testing.T, id int, userId int, planId int, total int64, used int64, allowWalletOverflow bool) {
	t.Helper()
	now := time.Now().Unix()
	require.NoError(t, model.DB.Create(&model.UserSubscription{
		Id:                  id,
		UserId:              userId,
		PlanId:              planId,
		AmountTotal:         total,
		AmountUsed:          used,
		StartTime:           now - 60,
		EndTime:             now + 3600,
		Status:              "active",
		AllowWalletOverflow: allowWalletOverflow,
	}).Error)
}

func newBillingTestRelayInfo(userId int, preference string, requestId string) *relaycommon.RelayInfo {
	return &relaycommon.RelayInfo{
		UserId:          userId,
		RequestId:       requestId,
		OriginModelName: "test-model",
		IsPlayground:    true,
		UserSetting: dto.UserSetting{
			BillingPreference: preference,
		},
	}
}

func TestNewBillingSessionSubscriptionFirstFallsBackToWallet(t *testing.T) {
	testCases := []struct {
		name          string
		subscriptions []model.UserSubscription
	}{
		{
			name: "exhausted subscription disallows wallet overflow",
			subscriptions: []model.UserSubscription{
				{Id: 1, PlanId: 1, AmountTotal: 100, AmountUsed: 100, AllowWalletOverflow: false},
			},
		},
		{
			name: "fragmented quota across subscriptions",
			subscriptions: []model.UserSubscription{
				{Id: 1, PlanId: 1, AmountTotal: 60, AmountUsed: 0, AllowWalletOverflow: false},
				{Id: 2, PlanId: 2, AmountTotal: 60, AmountUsed: 0, AllowWalletOverflow: true},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			truncate(t)
			seedUser(t, 1, 1000)
			for _, subscription := range testCase.subscriptions {
				seedBillingSubscriptionPlan(t, subscription.PlanId)
				seedBillingSubscription(t, subscription.Id, 1, subscription.PlanId, subscription.AmountTotal, subscription.AmountUsed, subscription.AllowWalletOverflow)
			}

			context, _ := gin.CreateTestContext(httptest.NewRecorder())
			session, apiErr := NewBillingSession(context, newBillingTestRelayInfo(1, "subscription_first", "subscription-first-"+testCase.name), 100)

			require.Nil(t, apiErr)
			require.NotNil(t, session)
			assert.Equal(t, BillingSourceWallet, session.funding.Source())
			assert.Equal(t, 900, getUserQuota(t, 1))
		})
	}
}

func TestNewBillingSessionSubscriptionOnlyDoesNotUseWallet(t *testing.T) {
	truncate(t)
	seedUser(t, 1, 1000)
	seedBillingSubscriptionPlan(t, 1)
	seedBillingSubscription(t, 1, 1, 1, 100, 100, true)

	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	session, apiErr := NewBillingSession(context, newBillingTestRelayInfo(1, "subscription_only", "subscription-only"), 100)

	require.Nil(t, session)
	require.NotNil(t, apiErr)
	assert.Equal(t, types.ErrorCodeInsufficientUserQuota, apiErr.GetErrorCode())
	assert.Equal(t, 1000, getUserQuota(t, 1))
}

func TestNewBillingSessionSubscriptionFirstReportsInsufficientWallet(t *testing.T) {
	truncate(t)
	seedUser(t, 1, 50)
	seedBillingSubscriptionPlan(t, 1)
	seedBillingSubscription(t, 1, 1, 1, 100, 100, false)

	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	session, apiErr := NewBillingSession(context, newBillingTestRelayInfo(1, "subscription_first", "subscription-first-insufficient-wallet"), 100)

	require.Nil(t, session)
	require.NotNil(t, apiErr)
	assert.Equal(t, types.ErrorCodeInsufficientUserQuota, apiErr.GetErrorCode())
	assert.Equal(t, 50, getUserQuota(t, 1))
}
