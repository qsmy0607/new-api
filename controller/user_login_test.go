package controller

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestLoginDistinguishesInvalidCredentialsFromDisabledUser(t *testing.T) {
	previousDB := model.DB
	previousPasswordLoginEnabled := common.PasswordLoginEnabled
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.User{}))
	model.DB = db
	common.PasswordLoginEnabled = true
	require.NoError(t, i18n.Init())
	t.Cleanup(func() {
		model.DB = previousDB
		common.PasswordLoginEnabled = previousPasswordLoginEnabled
	})

	passwordHash, err := common.Password2Hash("CorrectPassword123")
	require.NoError(t, err)
	users := []model.User{
		{
			Username: "enabled-user",
			Password: passwordHash,
			Status:   common.UserStatusEnabled,
			AffCode:  "enabled-user-aff",
		},
		{
			Username: "disabled-user",
			Password: passwordHash,
			Status:   common.UserStatusDisabled,
			AffCode:  "disabled-user-aff",
		},
	}
	require.NoError(t, db.Create(&users).Error)

	tests := []struct {
		name            string
		requestBody     string
		expectedMessage string
	}{
		{
			name:            "incorrect password",
			requestBody:     `{"username":"enabled-user","password":"WrongPassword123"}`,
			expectedMessage: "\u7528\u6237\u540d\u6216\u5bc6\u7801\u9519\u8bef",
		},
		{
			name:            "disabled user",
			requestBody:     `{"username":"disabled-user","password":"CorrectPassword123"}`,
			expectedMessage: "\u8be5\u7528\u6237\u5df2\u88ab\u7981\u7528",
		},
		{
			name:            "disabled user with incorrect password",
			requestBody:     `{"username":"disabled-user","password":"WrongPassword123"}`,
			expectedMessage: "\u7528\u6237\u540d\u6216\u5bc6\u7801\u9519\u8bef",
		},
	}

	gin.SetMode(gin.TestMode)
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(recorder)
			context.Request = httptest.NewRequest(
				http.MethodPost,
				"/api/user/login",
				bytes.NewBufferString(test.requestBody),
			)
			context.Request.Header.Set("Content-Type", "application/json")
			context.Request.Header.Set("Accept-Language", "zh-CN")

			Login(context)

			assert.Equal(t, http.StatusOK, recorder.Code)
			var response struct {
				Success bool   `json:"success"`
				Message string `json:"message"`
			}
			require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &response))
			assert.False(t, response.Success)
			assert.Equal(t, test.expectedMessage, response.Message)
		})
	}
}
