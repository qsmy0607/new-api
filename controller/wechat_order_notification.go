package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func GetWeChatOrderNotification(c *gin.Context) {
	config := model.GetWeChatOrderConfig()
	config.AppSecret = ""
	var recent []model.WeChatOrderNotification
	if err := model.DB.Order("id DESC").Limit(20).Find(&recent).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"config": config, "recent": recent}})
}

func SaveWeChatOrderNotification(c *gin.Context) {
	var config model.WeChatOrderConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	if err := model.SaveWeChatOrderConfig(config); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func TestWeChatOrderNotification(c *gin.Context) {
	if err := service.SendWeChatOrderTest(c.Request.Context()); err != nil {
		common.ApiError(c, common.NewMessage("WeChat test notification failed: {{reason}}", map[string]any{"reason": err.Error()}))
		return
	}
	common.ApiSuccess(c, nil)
}

func RetryWeChatOrderNotification(c *gin.Context) {
	var req struct {
		ID int64 `json:"id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.ID <= 0 {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	result := model.DB.Model(&model.WeChatOrderNotification{}).Where("id = ? AND status = ?", req.ID, "failed").
		Updates(map[string]any{"status": "pending", "attempts": 0, "next_attempt": common.GetTimestamp(), "last_error": ""})
	if result.Error != nil {
		common.ApiError(c, result.Error)
		return
	}
	if result.RowsAffected != 1 {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	common.ApiSuccess(c, nil)
}
