package model

import (
	"context"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// WeChatOrderNotification is an outbox entry committed with the paid order.
// The receiver and template are snapshots so configuration changes cannot redirect retries.
type WeChatOrderNotification struct {
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

type WeChatOrderConfig struct {
	Enabled          bool   `json:"enabled"`
	AppID            string `json:"app_id"`
	AppSecret        string `json:"app_secret,omitempty"`
	SecretConfigured bool   `json:"secret_configured"`
	TemplateID       string `json:"template_id"`
	Recipients       string `json:"recipients"`
}

func GetWeChatOrderConfig() WeChatOrderConfig {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	var c WeChatOrderConfig
	if raw := common.OptionMap["WeChatOrderConfigSecret"]; raw != "" {
		_ = common.UnmarshalJsonStr(raw, &c)
	}
	c.SecretConfigured = c.AppSecret != ""
	return c
}

func (c WeChatOrderConfig) Validate() error {
	if !c.Enabled {
		return nil
	}
	if c.AppID == "" || c.AppSecret == "" || c.TemplateID == "" || c.Recipients == "" {
		return common.NewMessage("Complete the WeChat order notification settings first.")
	}
	return nil
}

func SaveWeChatOrderConfig(c WeChatOrderConfig) error {
	c.AppID = strings.TrimSpace(c.AppID)
	c.AppSecret = strings.TrimSpace(c.AppSecret)
	c.TemplateID = strings.TrimSpace(c.TemplateID)
	recipients := strings.FieldsFunc(c.Recipients, func(r rune) bool { return r == ',' || r == '\n' || r == '\r' || r == ' ' || r == '，' })
	seen := map[string]bool{}
	unique := make([]string, 0, len(recipients))
	for _, recipient := range recipients {
		if len(recipient) > 64 {
			return common.NewMessage("Invalid WeChat order notification settings.")
		}
		if !seen[recipient] {
			seen[recipient] = true
			unique = append(unique, recipient)
		}
	}
	c.Recipients = strings.Join(unique, ",")
	if len(unique) > 20 || len(c.AppID) > 64 || len(c.AppSecret) > 256 || len(c.TemplateID) > 128 {
		return common.NewMessage("Invalid WeChat order notification settings.")
	}
	previous := GetWeChatOrderConfig()
	if c.AppSecret == "" && c.AppID == previous.AppID {
		c.AppSecret = previous.AppSecret
	}
	if err := c.Validate(); err != nil {
		return err
	}
	encoded, err := common.Marshal(c)
	if err != nil {
		return err
	}
	return UpdateOption("WeChatOrderConfigSecret", string(encoded))
}

func QueueWeChatOrderNotification(tx *gorm.DB, orderType, tradeNo, amount string, orderTime int64) error {
	c := GetWeChatOrderConfig()
	if !c.Enabled {
		return nil
	}
	if err := c.Validate(); err != nil {
		return err
	}
	now := common.GetTimestamp()
	for recipient := range strings.SplitSeq(c.Recipients, ",") {
		entry := WeChatOrderNotification{OrderType: orderType, TradeNo: tradeNo, Recipient: recipient,
			AppID: c.AppID, TemplateID: c.TemplateID, Amount: amount, OrderTime: orderTime,
			Status: "pending", NextAttempt: now, CreatedAt: now}
		if err := tx.Create(&entry).Error; err != nil {
			return err
		}
	}
	return nil
}

// ClaimWeChatOrderNotification uses a compare-and-swap lease across all database dialects.
func ClaimWeChatOrderNotification(entry *WeChatOrderNotification, now int64) (bool, error) {
	result := DB.Model(&WeChatOrderNotification{}).
		Where("id = ? AND status = ? AND next_attempt = ? AND next_attempt <= ?", entry.ID, entry.Status, entry.NextAttempt, now).
		Updates(map[string]any{"status": "sending", "next_attempt": now + 120, "attempts": gorm.Expr("attempts + 1")})
	if result.Error != nil || result.RowsAffected == 0 {
		return false, result.Error
	}
	entry.Status = "sending"
	entry.NextAttempt = now + 120
	entry.Attempts++
	return true, nil
}

// UpdateWeChatAccessToken serializes refreshes on databases with row locks.
func UpdateWeChatAccessToken(ctx context.Context, refresh func(string) (string, error)) error {
	const key = "WeChatOrderAccessToken"
	if err := DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&Option{Key: key}).Error; err != nil {
		return err
	}
	return DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var option Option
		if err := lockForUpdate(tx).Where(&Option{Key: key}).First(&option).Error; err != nil {
			return err
		}
		value, err := refresh(option.Value)
		if err != nil {
			return err
		}
		if value == option.Value {
			return nil
		}
		return tx.Model(&Option{}).Where(&Option{Key: key}).Update("value", value).Error
	})
}
