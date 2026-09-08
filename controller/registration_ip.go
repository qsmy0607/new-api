package controller

import (
	"errors"
	"net/http"

	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
)

var errRegistrationIPBlocked = errors.New("registration IP is blocked")

func registrationIPBlocked(c *gin.Context) bool {
	return setting.IsRegistrationIPBlocked(c.ClientIP())
}

func writeRegistrationIPBlocked(c *gin.Context) {
	c.JSON(http.StatusForbidden, gin.H{
		"success": false,
		"message": i18n.T(c, i18n.MsgUserRegistrationIPBlocked),
	})
}
