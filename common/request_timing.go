package common

import (
	"time"

	"github.com/gin-gonic/gin"
)

// RequestTiming 记录请求各阶段的时间点
type RequestTiming struct {
	// 请求开始
	StartTime time.Time

	// 中间件链路
	AfterRouting        time.Time // 路由完成
	AfterAuth           time.Time // 鉴权完成
	AfterChannelSelect  time.Time // 渠道选择完成
	AfterTokenCalculate time.Time // Token计算完成
	AfterPreCharge      time.Time // 预扣费完成

	// 上游交互
	BeforeUpstreamCall time.Time // 准备调用上游
	AfterConnEstablish time.Time // TCP连接建立
	FirstUpstreamByte  time.Time // 上游首字节到达
	FirstUpstreamEvent time.Time // 上游首个SSE事件

	// 客户端交互
	FirstClientFlush time.Time // 首次flush到客户端（TTFT - Time To First Token）

	// 响应完成
	LastUpstreamByte    time.Time // 上游最后字节
	GenerationComplete  time.Time // 生成完成
	AfterSettlement     time.Time // 结算完成
	RequestEnd          time.Time // 请求结束
}

// TimingBreakdown 各阶段耗时（毫秒）
type TimingBreakdown struct {
	RoutingMs          int64 `json:"routing_ms"`
	AuthMs             int64 `json:"auth_ms"`
	ChannelSelectMs    int64 `json:"channel_select_ms"`
	TokenCalcMs        int64 `json:"token_calc_ms"`
	PreChargeMs        int64 `json:"pre_charge_ms"`
	ConnEstablishMs    int64 `json:"conn_establish_ms"`
	UpstreamTTFBMs     int64 `json:"upstream_ttfb_ms"`      // Time To First Byte from upstream
	UpstreamFirstEvent int64 `json:"upstream_first_event_ms"`
	ClientTTFTMs       int64 `json:"client_ttft_ms"`        // ⭐ Time To First Token - 最重要的指标
	GenerationTimeMs   int64 `json:"generation_time_ms"`
	SettlementMs       int64 `json:"settlement_ms"`
	TotalMs            int64 `json:"total_ms"`

	// 衍生指标
	GatewayOverheadMs int64 `json:"gateway_overhead_ms"` // 网关总开销
	UpstreamDelayMs   int64 `json:"upstream_delay_ms"`   // 上游延迟
}

const (
	contextKeyRequestTiming = "request_timing"
)

// InitRequestTiming 初始化计时器
func InitRequestTiming(c *gin.Context) *RequestTiming {
	timing := &RequestTiming{
		StartTime: time.Now(),
	}
	c.Set(contextKeyRequestTiming, timing)
	return timing
}

// GetRequestTiming 获取计时器
func GetRequestTiming(c *gin.Context) *RequestTiming {
	if val, exists := c.Get(contextKeyRequestTiming); exists {
		if timing, ok := val.(*RequestTiming); ok {
			return timing
		}
	}
	return nil
}

// MarkTiming 记录计时点（简化调用）
func MarkTiming(c *gin.Context, point string) {
	timing := GetRequestTiming(c)
	if timing == nil {
		return
	}

	now := time.Now()
	switch point {
	case "routing":
		timing.AfterRouting = now
	case "auth":
		timing.AfterAuth = now
	case "channel_select":
		timing.AfterChannelSelect = now
	case "token_calc":
		timing.AfterTokenCalculate = now
	case "pre_charge":
		timing.AfterPreCharge = now
	case "before_upstream":
		timing.BeforeUpstreamCall = now
	case "conn_establish":
		timing.AfterConnEstablish = now
	case "first_upstream_byte":
		timing.FirstUpstreamByte = now
	case "first_upstream_event":
		timing.FirstUpstreamEvent = now
	case "first_client_flush":
		if timing.FirstClientFlush.IsZero() {
			timing.FirstClientFlush = now // ⭐ TTFT - 只记录第一次
		}
	case "generation_complete":
		timing.GenerationComplete = now
	case "settlement":
		timing.AfterSettlement = now
	case "request_end":
		timing.RequestEnd = now
	}
}

// GetBreakdown 计算各阶段耗时
func (t *RequestTiming) GetBreakdown() *TimingBreakdown {
	if t.StartTime.IsZero() {
		return nil
	}

	breakdown := &TimingBreakdown{}

	// 基础阶段耗时
	if !t.AfterRouting.IsZero() {
		breakdown.RoutingMs = t.AfterRouting.Sub(t.StartTime).Milliseconds()
	}
	if !t.AfterAuth.IsZero() && !t.AfterRouting.IsZero() {
		breakdown.AuthMs = t.AfterAuth.Sub(t.AfterRouting).Milliseconds()
	}
	if !t.AfterChannelSelect.IsZero() && !t.AfterAuth.IsZero() {
		breakdown.ChannelSelectMs = t.AfterChannelSelect.Sub(t.AfterAuth).Milliseconds()
	}
	if !t.AfterTokenCalculate.IsZero() && !t.AfterChannelSelect.IsZero() {
		breakdown.TokenCalcMs = t.AfterTokenCalculate.Sub(t.AfterChannelSelect).Milliseconds()
	}
	if !t.AfterPreCharge.IsZero() && !t.AfterTokenCalculate.IsZero() {
		breakdown.PreChargeMs = t.AfterPreCharge.Sub(t.AfterTokenCalculate).Milliseconds()
	}

	// 上游连接
	if !t.AfterConnEstablish.IsZero() && !t.BeforeUpstreamCall.IsZero() {
		breakdown.ConnEstablishMs = t.AfterConnEstablish.Sub(t.BeforeUpstreamCall).Milliseconds()
	}
	if !t.FirstUpstreamByte.IsZero() && !t.AfterConnEstablish.IsZero() {
		breakdown.UpstreamTTFBMs = t.FirstUpstreamByte.Sub(t.AfterConnEstablish).Milliseconds()
	}
	if !t.FirstUpstreamEvent.IsZero() && !t.FirstUpstreamByte.IsZero() {
		breakdown.UpstreamFirstEvent = t.FirstUpstreamEvent.Sub(t.FirstUpstreamByte).Milliseconds()
	}

	// ⭐ TTFT - Time To First Token（最重要的指标）
	if !t.FirstClientFlush.IsZero() {
		breakdown.ClientTTFTMs = t.FirstClientFlush.Sub(t.StartTime).Milliseconds()
	}

	// 生成和结算
	if !t.GenerationComplete.IsZero() && !t.FirstUpstreamEvent.IsZero() {
		breakdown.GenerationTimeMs = t.GenerationComplete.Sub(t.FirstUpstreamEvent).Milliseconds()
	}
	if !t.AfterSettlement.IsZero() && !t.GenerationComplete.IsZero() {
		breakdown.SettlementMs = t.AfterSettlement.Sub(t.GenerationComplete).Milliseconds()
	}

	// 总耗时
	if !t.RequestEnd.IsZero() {
		breakdown.TotalMs = t.RequestEnd.Sub(t.StartTime).Milliseconds()
	}

	// 衍生指标
	breakdown.GatewayOverheadMs = breakdown.RoutingMs + breakdown.AuthMs +
		breakdown.ChannelSelectMs + breakdown.TokenCalcMs + breakdown.PreChargeMs

	if !t.FirstUpstreamByte.IsZero() && !t.BeforeUpstreamCall.IsZero() {
		breakdown.UpstreamDelayMs = t.FirstUpstreamByte.Sub(t.BeforeUpstreamCall).Milliseconds()
	}

	return breakdown
}

// IsEnabled 检查是否启用了计时功能（根据采样率）
func IsTimingEnabled(c *gin.Context) bool {
	// 从配置读取是否启用
	// 这里先简单返回true，后续可以加采样逻辑
	return GetOptimizationConfig().TimingEnabled
}

// ShouldSample 是否应该采样这个请求
func ShouldSample() bool {
	config := GetOptimizationConfig()
	if !config.TimingEnabled {
		return false
	}

	// 如果采样率为1.0，所有请求都采样
	if config.TimingSampleRate >= 1.0 {
		return true
	}

	// 如果采样率为0，不采样
	if config.TimingSampleRate <= 0 {
		return false
	}

	// 根据采样率随机采样
	// 这里简化实现，实际可以用更高效的算法
	return true // 暂时所有请求都采样，后续优化
}
