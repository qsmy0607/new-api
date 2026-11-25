package service

import (
	"context"
	"maps"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type releasedWeChatOrderNotification struct {
	ID          int64  `json:"id" gorm:"primaryKey"`
	OrderType   string `json:"order_type" gorm:"type:varchar(20);uniqueIndex:idx_wechat_order_recipient,priority:1"`
	TradeNo     string `json:"trade_no" gorm:"type:varchar(255);uniqueIndex:idx_wechat_order_recipient,priority:2"`
	Recipient   string `json:"recipient" gorm:"type:varchar(64);uniqueIndex:idx_wechat_order_recipient,priority:3"`
	AppID       string `json:"-" gorm:"type:varchar(64)"`
	TemplateID  string `json:"-" gorm:"type:varchar(128)"`
	Amount      string `json:"amount" gorm:"type:varchar(128)"`
	OrderTime   int64  `json:"order_time"`
	Status      string `json:"status" gorm:"type:varchar(20);index:idx_wechat_due,priority:1"`
	Attempts    int    `json:"attempts"`
	NextAttempt int64  `json:"next_attempt" gorm:"index:idx_wechat_due,priority:2"`
	LastError   string `json:"last_error" gorm:"type:varchar(128)"`
	CreatedAt   int64  `json:"created_at"`
}

func (releasedWeChatOrderNotification) TableName() string { return "we_chat_order_notifications" }

func weChatOrderFixture(t *testing.T, dialector gorm.Dialector) *gorm.DB {
	t.Helper()
	if dialector.Name() == "sqlite" {
		dialector = sqlite.Open(t.TempDir() + "/wechat.db")
	}
	db, err := gorm.Open(dialector, &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(8)
	oldDB, oldLogDB := model.DB, model.LOG_DB
	oldMain, oldLog := common.MainDatabaseType(), common.LogDatabaseType()
	oldOptions := maps.Clone(common.OptionMap)
	oldClient := weChatOrderClient
	model.DB, model.LOG_DB = db, db
	switch dialector.Name() {
	case "mysql":
		common.SetDatabaseTypes(common.DatabaseTypeMySQL, common.DatabaseTypeMySQL)
	case "postgres":
		common.SetDatabaseTypes(common.DatabaseTypePostgreSQL, common.DatabaseTypePostgreSQL)
	default:
		common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
	}
	common.OptionMap = map[string]string{}
	t.Cleanup(func() {
		model.DB, model.LOG_DB = oldDB, oldLogDB
		common.SetDatabaseTypes(oldMain, oldLog)
		common.OptionMap = oldOptions
		weChatOrderClient = oldClient
		require.NoError(t, sqlDB.Close())
	})
	require.NoError(t, db.AutoMigrate(&model.Option{}, &model.User{}, &model.Log{}, &model.TopUp{}, &model.SubscriptionOrder{}, &model.SubscriptionPlan{}, &model.UserSubscription{}))
	require.NoError(t, model.SaveWeChatOrderConfig(model.WeChatOrderConfig{Enabled: true, AppID: "test-app", AppSecret: "test-secret", TemplateID: "test-template", Recipients: "receiver,receiver\nsecond"}))
	return db
}

func TestWeChatOrderPaymentOutbox(t *testing.T) {
	engines := []struct {
		name      string
		dialector gorm.Dialector
	}{{"sqlite", sqlite.Open(":memory:")}}
	if dsn := os.Getenv("WECHAT_TEST_MYSQL_DSN"); dsn != "" {
		engines = append(engines, struct {
			name      string
			dialector gorm.Dialector
		}{"mysql", mysql.Open(dsn)})
	}
	if dsn := os.Getenv("WECHAT_TEST_POSTGRES_DSN"); dsn != "" {
		engines = append(engines, struct {
			name      string
			dialector gorm.Dialector
		}{"postgres", postgres.Open(dsn)})
	}
	for _, engine := range engines {
		t.Run(engine.name, func(t *testing.T) {
			db := weChatOrderFixture(t, engine.dialector)
			// Verify a fresh outbox, then simulate upgrading a database without it.
			require.NoError(t, db.AutoMigrate(&model.WeChatOrderNotification{}))
			assert.True(t, db.Migrator().HasIndex(&model.WeChatOrderNotification{}, "idx_wechat_order_recipient"))
			require.NoError(t, db.Migrator().DropTable(&model.WeChatOrderNotification{}))
			// TopUp's schema is unchanged from v1.0.0-rc.47. Preserve a paid order
			// created before the additive outbox migration, without notifying it.
			history := model.TopUp{TradeNo: "historical", Status: common.TopUpStatusSuccess, Money: 7.25}
			require.NoError(t, db.Create(&history).Error)
			require.NoError(t, db.AutoMigrate(&releasedWeChatOrderNotification{}))
			legacy := releasedWeChatOrderNotification{OrderType: "topup", TradeNo: "legacy", Recipient: "receiver", TemplateID: "old-template", Amount: "9.50", OrderTime: 1700000000, Status: "sent"}
			require.NoError(t, db.Create(&legacy).Error)
			for range 2 {
				require.NoError(t, db.AutoMigrate(&model.WeChatOrderNotification{}))
			}
			var oldEntry model.WeChatOrderNotification
			require.NoError(t, db.First(&oldEntry, legacy.ID).Error)
			assert.Equal(t, legacy.Amount, oldEntry.Amount)
			assert.Equal(t, legacy.OrderTime, oldEntry.OrderTime)
			assert.Equal(t, "old-template", oldEntry.TemplateID)
			assert.Empty(t, oldEntry.ProductName)
			var preserved model.TopUp
			require.NoError(t, db.First(&preserved, history.Id).Error)
			assert.Equal(t, history.TradeNo, preserved.TradeNo)
			assert.Equal(t, history.Money, preserved.Money)
			assert.True(t, db.Migrator().HasIndex(&model.WeChatOrderNotification{}, "idx_wechat_order_recipient"))
			user := model.User{Username: "wechat-payer", Quota: 0}
			require.NoError(t, db.Create(&user).Error)
			for _, provider := range []string{model.PaymentProviderEpay, model.PaymentProviderStripe, model.PaymentProviderCreem, model.PaymentProviderWaffo, model.PaymentProviderWaffoPancake} {
				order := model.TopUp{UserId: user.Id, TradeNo: "order-" + provider, PaymentProvider: provider, PaymentMethod: provider, Amount: 1, Money: 1, Status: common.TopUpStatusPending, CreateTime: 1700000000}
				require.NoError(t, db.Create(&order).Error)
				switch provider {
				case model.PaymentProviderEpay:
					_, err := model.RechargeEpay(order.TradeNo, provider, "127.0.0.1")
					require.NoError(t, err)
					already, err := model.RechargeEpay(order.TradeNo, provider, "127.0.0.1")
					require.NoError(t, err)
					assert.True(t, already)
				case model.PaymentProviderStripe:
					require.NoError(t, model.Recharge(order.TradeNo, "", "127.0.0.1", "0.75 USD"))
				case model.PaymentProviderCreem:
					require.NoError(t, model.RechargeCreem(order.TradeNo, "", "", "127.0.0.1", "0.75 USD"))
				case model.PaymentProviderWaffo:
					require.NoError(t, model.RechargeWaffo(order.TradeNo, "127.0.0.1"))
				case model.PaymentProviderWaffoPancake:
					require.NoError(t, model.RechargeWaffoPancake(order.TradeNo))
				}
				var entries []model.WeChatOrderNotification
				require.NoError(t, db.Where("trade_no = ?", order.TradeNo).Find(&entries).Error)
				require.Len(t, entries, 2)
				assert.Greater(t, entries[0].OrderTime, order.CreateTime)
				assert.Equal(t, "额度充值", entries[0].ProductName)
				var paid model.TopUp
				require.NoError(t, db.First(&paid, order.Id).Error)
				assert.Equal(t, paid.CompleteTime, entries[0].OrderTime)
				if provider == model.PaymentProviderStripe || provider == model.PaymentProviderCreem {
					assert.Equal(t, "0.75 USD", entries[0].Amount)
				}
			}
			plan := model.SubscriptionPlan{Title: "WeChat plan", PriceAmount: 3, DurationUnit: model.SubscriptionDurationMonth, DurationValue: 1, Enabled: true}
			require.NoError(t, db.Create(&plan).Error)
			subscription := model.SubscriptionOrder{UserId: user.Id, PlanId: plan.Id, Money: 3, TradeNo: "subscription", PaymentProvider: model.PaymentProviderEpay, PaymentMethod: "alipay", Status: common.TopUpStatusPending}
			require.NoError(t, subscription.Insert())
			for range 2 {
				require.NoError(t, model.CompleteSubscriptionOrder(subscription.TradeNo, "", model.PaymentProviderEpay, "alipay"))
			}
			var entries []model.WeChatOrderNotification
			require.NoError(t, db.Where("trade_no = ?", subscription.TradeNo).Find(&entries).Error)
			require.Len(t, entries, 2)
			assert.Equal(t, "subscription", entries[0].OrderType)
			assert.Equal(t, plan.Title, entries[0].ProductName)
			var paidSubscription model.SubscriptionOrder
			require.NoError(t, db.First(&paidSubscription, subscription.Id).Error)
			assert.Equal(t, paidSubscription.CompleteTime, entries[0].OrderTime)
			// The companion recharge record must not produce a second event.
			var companion model.TopUp
			require.NoError(t, db.Where("trade_no = ?", subscription.TradeNo).First(&companion).Error)
			assert.Equal(t, common.TopUpStatusSuccess, companion.Status)
			// Wallet ceiling failure rolls back both payment and notification.
			require.NoError(t, db.Model(&user).Update("quota", common.MaxWalletQuota).Error)
			failed := model.TopUp{UserId: user.Id, TradeNo: "rollback", PaymentProvider: model.PaymentProviderEpay, Amount: 1, Money: 1, Status: common.TopUpStatusPending}
			require.NoError(t, db.Create(&failed).Error)
			_, err := model.RechargeEpay(failed.TradeNo, "", "127.0.0.1")
			require.Error(t, err)
			var count int64
			require.NoError(t, db.Model(&model.WeChatOrderNotification{}).Where("trade_no = ?", failed.TradeNo).Count(&count).Error)
			assert.Zero(t, count)
			require.NoError(t, db.Model(&user).Update("quota", 0).Error)
			manual := model.TopUp{UserId: user.Id, TradeNo: "manual", PaymentProvider: model.PaymentProviderEpay, Amount: 1, Money: 1, Status: common.TopUpStatusPending}
			require.NoError(t, db.Create(&manual).Error)
			require.NoError(t, model.ManualCompleteTopUp(manual.TradeNo, "127.0.0.1"))
			require.NoError(t, db.Model(&model.WeChatOrderNotification{}).Where("trade_no = ?", manual.TradeNo).Count(&count).Error)
			assert.Zero(t, count)
			config := model.GetWeChatOrderConfig()
			config.Enabled = false
			require.NoError(t, model.SaveWeChatOrderConfig(config))
			require.NoError(t, db.Transaction(func(tx *gorm.DB) error {
				return model.QueueWeChatOrderNotification(tx, "topup", "disabled", "1.00", 1700000000, "额度充值")
			}))
			require.NoError(t, db.Model(&model.WeChatOrderNotification{}).Where("trade_no = ?", "disabled").Count(&count).Error)
			assert.Zero(t, count)

			// Competing workers cannot acquire the same lease; a crashed lease can expire.
			entry, stale := entries[0], entries[0]
			now := common.GetTimestamp()
			claimed, err := model.ClaimWeChatOrderNotification(&entry, now)
			require.NoError(t, err)
			assert.True(t, claimed)
			claimed, err = model.ClaimWeChatOrderNotification(&stale, now)
			require.NoError(t, err)
			assert.False(t, claimed)
			claimed, err = model.ClaimWeChatOrderNotification(&entry, now+121)
			require.NoError(t, err)
			assert.True(t, claimed)
			// Unique order/recipient constraint survives repeated migration.
			duplicate := entries[1]
			duplicate.ID = 0
			assert.Error(t, db.Create(&duplicate).Error)
		})
	}
}

func TestWeChatOrderDeliveryAndRecovery(t *testing.T) {
	db := weChatOrderFixture(t, sqlite.Open(":memory:"))
	require.NoError(t, db.AutoMigrate(&model.WeChatOrderNotification{}))
	var payloads []map[string]any
	tokenCalls, sends := 0, 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/cgi-bin/stable_token":
			_, _ = w.Write([]byte(`{"errcode":48001}`))
		case "/cgi-bin/token":
			tokenCalls++
			assert.Equal(t, "test-secret", r.URL.Query().Get("secret"))
			_, _ = w.Write([]byte(`{"access_token":"test-access-token","expires_in":7200}`))
		case "/cgi-bin/message/template/send":
			sends++
			var payload map[string]any
			require.NoError(t, common.DecodeJson(r.Body, &payload))
			payloads = append(payloads, payload)
			if payload["data"].(map[string]any)["name"].(map[string]any)["value"] == "permanent" {
				_, _ = w.Write([]byte(`{"errcode":43004}`))
				return
			}
			if sends == 1 {
				_, _ = w.Write([]byte(`{"errcode":42001}`))
				return
			}
			if sends == 3 {
				_, _ = w.Write([]byte(`{"errcode":-1}`))
				return
			}
			_, _ = w.Write([]byte(`{"errcode":0,"msgid":123}`))
		}
	}))
	t.Cleanup(server.Close)
	weChatOrderClient = &weChatTemplateClient{http: server.Client(), baseURL: server.URL}
	require.NoError(t, db.Transaction(func(tx *gorm.DB) error {
		return model.QueueWeChatOrderNotification(tx, "topup", "paid", "12.50", 1700000000, "额度充值")
	}))
	require.NoError(t, runWeChatOrderNotifications(context.Background()))
	var entries []model.WeChatOrderNotification
	require.NoError(t, db.Order("id").Find(&entries).Error)
	require.Len(t, entries, 2)
	assert.Equal(t, "sent", entries[0].Status)
	assert.Equal(t, "pending", entries[1].Status)
	assert.Equal(t, "WeChat API error -1", entries[1].LastError)
	assert.Equal(t, 2, tokenCalls)
	assert.NotContains(t, payloads[0], "url")
	assert.Equal(t, map[string]any{"value": "额度充值"}, payloads[0]["data"].(map[string]any)["name"])

	assert.Equal(t, map[string]any{"value": "12.50"}, payloads[0]["data"].(map[string]any)["amount"])
	assert.Equal(t, map[string]any{"value": "2023-11-15 06:13:20"}, payloads[0]["data"].(map[string]any)["pay_time"])
	// Simulate process restart and a due retry; the shared token cache is reused.
	weChatOrderClient = &weChatTemplateClient{http: server.Client(), baseURL: server.URL}
	require.NoError(t, db.Model(&entries[1]).Update("next_attempt", common.GetTimestamp()-1).Error)
	require.NoError(t, runWeChatOrderNotifications(context.Background()))
	assert.Equal(t, 2, tokenCalls)
	require.NoError(t, db.First(&entries[1], entries[1].ID).Error)
	assert.Equal(t, "sent", entries[1].Status)
	// Empty-secret saves preserve the credential and invalid enabled settings fail.
	config := model.GetWeChatOrderConfig()
	config.AppSecret = ""
	require.NoError(t, model.SaveWeChatOrderConfig(config))
	assert.Equal(t, "test-secret", model.GetWeChatOrderConfig().AppSecret)
	config.AppID = "different-app"
	assert.Error(t, model.SaveWeChatOrderConfig(config))
	config = model.GetWeChatOrderConfig()
	config.Recipients = "receiver"
	require.NoError(t, model.SaveWeChatOrderConfig(config))
	require.NoError(t, db.Transaction(func(tx *gorm.DB) error {
		return model.QueueWeChatOrderNotification(tx, "topup", "permanent", "1.00", 1700000000, "permanent")
	}))
	require.NoError(t, runWeChatOrderNotifications(context.Background()))
	var permanent model.WeChatOrderNotification
	require.NoError(t, db.Where("trade_no = ?", "permanent").First(&permanent).Error)
	assert.Equal(t, "failed", permanent.Status)
	before := sends
	require.NoError(t, runWeChatOrderNotifications(context.Background()))
	assert.Equal(t, before, sends)

	// Failed network requests do not disclose the secret-bearing URL.
	server.Close()
	err := weChatOrderClient.request(context.Background(), "GET", "/cgi-bin/token?secret=must-not-leak", nil, &config)
	require.Error(t, err)
	assert.NotContains(t, err.Error(), "must-not-leak")
	assert.NotContains(t, err.Error(), server.URL)
}
