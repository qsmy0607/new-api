package controller

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/oauth"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type registrationIPTestProvider struct {
	existing bool
}

func (*registrationIPTestProvider) GetName() string { return "Registration IP Test" }
func (*registrationIPTestProvider) IsEnabled() bool { return true }
func (*registrationIPTestProvider) ExchangeToken(context.Context, string, *gin.Context) (*oauth.OAuthToken, error) {
	return &oauth.OAuthToken{}, nil
}
func (*registrationIPTestProvider) GetUserInfo(context.Context, *oauth.OAuthToken) (*oauth.OAuthUser, error) {
	return &oauth.OAuthUser{ProviderUserID: "external-user"}, nil
}
func (provider *registrationIPTestProvider) IsUserIDTaken(string) bool { return provider.existing }
func (*registrationIPTestProvider) FillUserByProviderID(user *model.User, _ string) error {
	user.Id = 42
	user.Status = common.UserStatusEnabled
	return nil
}
func (*registrationIPTestProvider) SetProviderUserID(*model.User, string) {}
func (*registrationIPTestProvider) GetProviderPrefix() string             { return "registration_ip_" }
func (*registrationIPTestProvider) ProviderUserIDColumn() string          { return "oidc_id" }

func enableRegistrationIPBlacklistForTest(t *testing.T) {
	t.Helper()
	require.NoError(t, setting.UpdateRegistrationIPBlacklist("203.0.113.10"))
	setting.SetRegistrationIPBlacklistEnabled(true)
	t.Cleanup(func() {
		setting.SetRegistrationIPBlacklistEnabled(false)
		require.NoError(t, setting.UpdateRegistrationIPBlacklist(""))
	})
}

func blockedRegistrationContext() (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/", nil)
	c.Request.RemoteAddr = "203.0.113.10:12345"
	return c, recorder
}

func TestPasswordRegistrationRejectsBlockedIP(t *testing.T) {
	gin.SetMode(gin.TestMode)
	require.NoError(t, i18n.Init())
	enableRegistrationIPBlacklistForTest(t)
	previousRegisterEnabled := common.RegisterEnabled
	previousPasswordRegisterEnabled := common.PasswordRegisterEnabled
	common.RegisterEnabled = true
	common.PasswordRegisterEnabled = true
	t.Cleanup(func() {
		common.RegisterEnabled = previousRegisterEnabled
		common.PasswordRegisterEnabled = previousPasswordRegisterEnabled
	})

	c, recorder := blockedRegistrationContext()
	c.Request.Header.Set("Accept-Language", "en")
	Register(c)

	assert.Equal(t, http.StatusForbidden, recorder.Code)
	assert.Contains(t, recorder.Body.String(), "Registration is not available from the current network")
}

func TestOAuthRegistrationRejectsBlockedIPButExistingLoginIsAllowed(t *testing.T) {
	gin.SetMode(gin.TestMode)
	enableRegistrationIPBlacklistForTest(t)
	previousRegisterEnabled := common.RegisterEnabled
	common.RegisterEnabled = true
	t.Cleanup(func() { common.RegisterEnabled = previousRegisterEnabled })
	oauthUser := &oauth.OAuthUser{ProviderUserID: "external-user"}

	c, _ := blockedRegistrationContext()
	_, err := findOrCreateOAuthUser(c, &registrationIPTestProvider{}, oauthUser, "")
	assert.ErrorIs(t, err, errRegistrationIPBlocked)

	existingUser, err := findOrCreateOAuthUser(c, &registrationIPTestProvider{existing: true}, oauthUser, "")
	require.NoError(t, err)
	assert.Equal(t, 42, existingUser.Id)
}
