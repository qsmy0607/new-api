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
			// 输出到日志（结构化）
			logger.LogInfo(c, "request_timing_breakdown",
				"routing_ms", breakdown.RoutingMs,
				"auth_ms", breakdown.AuthMs,
				"channel_select_ms", breakdown.ChannelSelectMs,
				"token_calc_ms", breakdown.TokenCalcMs,
				"pre_charge_ms", breakdown.PreChargeMs,
				"conn_establish_ms", breakdown.ConnEstablishMs,
				"upstream_ttfb_ms", breakdown.UpstreamTTFBMs,
				"upstream_first_event_ms", breakdown.UpstreamFirstEvent,
				"client_ttft_ms", breakdown.ClientTTFTMs, // ⭐ TTFT
				"generation_time_ms", breakdown.GenerationTimeMs,
				"settlement_ms", breakdown.SettlementMs,
				"total_ms", breakdown.TotalMs,
				"gateway_overhead_ms", breakdown.GatewayOverheadMs,
				"upstream_delay_ms", breakdown.UpstreamDelayMs,
			)

			// TODO: 发送到监控系统（Prometheus）
			// metrics.RecordRequestTiming(breakdown)
		}
	}
}
