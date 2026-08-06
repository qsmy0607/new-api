package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	appI18n "github.com/QuantumNous/new-api/i18n"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSendEmailVerificationLocalizesEmailRestrictionErrors(t *testing.T) {
	require.NoError(t, appI18n.Init())

	originalDomainRestriction := common.EmailDomainRestrictionEnabled
	originalAliasRestriction := common.EmailAliasRestrictionEnabled
	originalWhitelist := common.EmailDomainWhitelist
	t.Cleanup(func() {
		common.EmailDomainRestrictionEnabled = originalDomainRestriction
		common.EmailAliasRestrictionEnabled = originalAliasRestriction
		common.EmailDomainWhitelist = originalWhitelist
	})

	tests := []struct {
		name              string
		email             string
		language          string
		domainRestriction bool
		aliasRestriction  bool
		wantCode          string
		wantMessage       string
	}{
		{
			name:              "domain restriction in simplified Chinese",
			email:             "user@blocked.example",
			language:          "zh-CN",
			domainRestriction: true,
			wantCode:          "EMAIL_DOMAIN_NOT_ALLOWED",
			wantMessage:       "该邮箱地址不符合注册要求，请使用允许的邮箱域名进行注册。",
		},
		{
			name:              "domain restriction in English",
			email:             "user@blocked.example",
			language:          "en",
			domainRestriction: true,
			wantCode:          "EMAIL_DOMAIN_NOT_ALLOWED",
			wantMessage:       "This email address does not meet the registration requirements. Please register with an allowed email domain.",
		},
		{
			name:             "alias restriction in simplified Chinese",
			email:            "first.last@allowed.example",
			language:         "zh-CN",
			aliasRestriction: true,
			wantCode:         "EMAIL_ALIAS_NOT_ALLOWED",
			wantMessage:      "该邮箱地址包含不允许的别名符号，请确保“@”前的部分不包含“+”或“.”。",
		},
		{
			name:             "alias restriction in English",
			email:            "first.last@allowed.example",
			language:         "en",
			aliasRestriction: true,
			wantCode:         "EMAIL_ALIAS_NOT_ALLOWED",
			wantMessage:      "This email address contains a disallowed alias character. Make sure the part before \"@\" does not contain \"+\" or \".\".",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			common.EmailDomainRestrictionEnabled = tt.domainRestriction
			common.EmailAliasRestrictionEnabled = tt.aliasRestriction
			common.EmailDomainWhitelist = []string{"allowed.example"}

			response := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(response)
			context.Request = httptest.NewRequest(
				http.MethodGet,
				"/api/verification?email="+tt.email,
				nil,
			)
			context.Request.Header.Set("Accept-Language", tt.language)

			SendEmailVerification(context)

			var payload struct {
				Success bool   `json:"success"`
				Code    string `json:"code"`
				Message string `json:"message"`
			}
			require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
			assert.False(t, payload.Success)
			assert.Equal(t, tt.wantCode, payload.Code)
			assert.Equal(t, tt.wantMessage, payload.Message)
		})
	}
}
