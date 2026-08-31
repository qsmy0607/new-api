package middleware

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/gin-gonic/gin"
)

// RequestTimingMiddleware 请求计时中间件
func RequestTimingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 检查是否启用计时
		if !common.IsTimingEnabled() {
			c.Next()
			return
		}

		// 初始化计时器
		timing := common.InitRequestTiming(c)
		common.MarkTiming(c, "routing")

		// 处理请求
		c.Next()

		// 请求结束，记录最终时间并输出
		common.MarkTiming(c, "request_end")

		breakdown := timing.GetBreakdown()
		if breakdown != nil {
			// 输出到日志（JSON格式）
			logMsg := common.Sprintf("request_timing_breakdown: routing=%dms auth=%dms channel_select=%dms token_calc=%dms pre_charge=%dms conn_establish=%dms upstream_ttfb=%dms upstream_first_event=%dms client_ttft=%dms generation=%dms settlement=%dms total=%dms gateway_overhead=%dms upstream_delay=%dms",
				breakdown.RoutingMs,
				breakdown.AuthMs,
				breakdown.ChannelSelectMs,
				breakdown.TokenCalcMs,
				breakdown.PreChargeMs,
				breakdown.ConnEstablishMs,
				breakdown.UpstreamTTFBMs,
				breakdown.UpstreamFirstEvent,
				breakdown.ClientTTFTMs, // ⭐ TTFT
				breakdown.GenerationTimeMs,
				breakdown.SettlementMs,
				breakdown.TotalMs,
				breakdown.GatewayOverheadMs,
				breakdown.UpstreamDelayMs,
			)
			logger.LogInfo(c, logMsg)

			// TODO: 发送到监控系统（Prometheus）
			// metrics.RecordRequestTiming(breakdown)
		}
	}
}
