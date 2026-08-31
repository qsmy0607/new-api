package common

import (
	"os"
	"strconv"
	"sync/atomic"
)

// OptimizationConfig 优化特性配置
type OptimizationConfig struct {
	// 分段计时
	TimingEnabled    bool    // 是否启用计时
	TimingSampleRate float64 // 采样率 (0.0-1.0)

	// 流式优化（暂未实施）
	FlushEveryChunk     bool // 每个chunk立即flush
	FirstChunkImmediate bool // 首chunk立即flush

	// Playground优化（暂未实施）
	PlaygroundImmediateRender bool // 首帧立即渲染
}

var optimizationConfig atomic.Value

func init() {
	// 加载默认配置
	loadOptimizationConfig()
}

// loadOptimizationConfig 从环境变量加载配置
func loadOptimizationConfig() {
	config := &OptimizationConfig{
		// 默认值
		TimingEnabled:             true,
		TimingSampleRate:          1.0, // 默认100%采样
		FlushEveryChunk:           false,
		FirstChunkImmediate:       false,
		PlaygroundImmediateRender: false,
	}

	// 从环境变量读取
	if val := os.Getenv("OPTIMIZATION_TIMING_ENABLED"); val != "" {
		if enabled, err := strconv.ParseBool(val); err == nil {
			config.TimingEnabled = enabled
		}
	}

	if val := os.Getenv("OPTIMIZATION_TIMING_SAMPLE_RATE"); val != "" {
		if rate, err := strconv.ParseFloat(val, 64); err == nil {
			if rate >= 0 && rate <= 1.0 {
				config.TimingSampleRate = rate
			}
		}
	}

	if val := os.Getenv("OPTIMIZATION_FLUSH_EVERY_CHUNK"); val != "" {
		if enabled, err := strconv.ParseBool(val); err == nil {
			config.FlushEveryChunk = enabled
		}
	}

	if val := os.Getenv("OPTIMIZATION_FIRST_CHUNK_IMMEDIATE"); val != "" {
		if enabled, err := strconv.ParseBool(val); err == nil {
			config.FirstChunkImmediate = enabled
		}
	}

	if val := os.Getenv("OPTIMIZATION_PLAYGROUND_IMMEDIATE_RENDER"); val != "" {
		if enabled, err := strconv.ParseBool(val); err == nil {
			config.PlaygroundImmediateRender = enabled
		}
	}

	optimizationConfig.Store(config)
}

// GetOptimizationConfig 获取当前优化配置
func GetOptimizationConfig() *OptimizationConfig {
	return optimizationConfig.Load().(*OptimizationConfig)
}

// ReloadOptimizationConfig 重新加载配置（支持热更新）
func ReloadOptimizationConfig() {
	loadOptimizationConfig()
	SysLog("optimization config reloaded")
}

// IsTimingEnabled 是否启用计时
func IsTimingEnabled() bool {
	return GetOptimizationConfig().TimingEnabled
}

// IsFlushEveryChunkEnabled 是否启用每chunk立即flush
func IsFlushEveryChunkEnabled() bool {
	return GetOptimizationConfig().FlushEveryChunk
}

// IsFirstChunkImmediateEnabled 是否启用首chunk立即flush
func IsFirstChunkImmediateEnabled() bool {
	return GetOptimizationConfig().FirstChunkImmediate
}

// IsPlaygroundImmediateRenderEnabled 是否启用Playground首帧立即渲染
func IsPlaygroundImmediateRenderEnabled() bool {
	return GetOptimizationConfig().PlaygroundImmediateRender
}
