package operation_setting

import (
	"strings"

	"github.com/QuantumNous/new-api/setting/config"
)

type QuotaSetting struct {
	EnableFreeModelPreConsume            bool   `json:"enable_free_model_pre_consume"`             // 是否对免费模型启用预消耗
	NewUserQuotaDomainRestrictionEnabled bool   `json:"new_user_quota_domain_restriction_enabled"` // 是否按邮箱域名限制新用户额度
	NewUserQuotaExcludedDomains          string `json:"new_user_quota_excluded_domains"`           // 不发放新用户额度的邮箱域名
}

// 默认配置
var quotaSetting = QuotaSetting{
	EnableFreeModelPreConsume: true,
}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("quota_setting", &quotaSetting)
}

func GetQuotaSetting() *QuotaSetting {
	return &quotaSetting
}

func ShouldExcludeNewUserQuota(email string) bool {
	if !quotaSetting.NewUserQuotaDomainRestrictionEnabled {
		return false
	}

	at := strings.LastIndex(email, "@")
	if at <= 0 || at == len(email)-1 {
		return false
	}
	emailDomain := strings.ToLower(strings.TrimSpace(email[at+1:]))
	for _, configuredDomain := range strings.Split(quotaSetting.NewUserQuotaExcludedDomains, ",") {
		if emailDomain == strings.ToLower(strings.TrimSpace(configuredDomain)) {
			return true
		}
	}
	return false
}
