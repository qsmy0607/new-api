package service

import (
	"bytes"
	"context"
	"crypto/sha256"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

// A single worker runs per process. Row leases deduplicate deliveries between processes.
var weChatOrderClient = &weChatTemplateClient{http: &http.Client{Timeout: 10 * time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }}}

type weChatAPIError struct{ Code int }

func (e *weChatAPIError) Error() string { return fmt.Sprintf("WeChat API error %d", e.Code) }

type weChatTemplateClient struct {
	http    *http.Client
	baseURL string
	mu      sync.Mutex
	appID   string
	secret  string
	token   string
	expires time.Time
}

func (c *weChatTemplateClient) request(ctx context.Context, method, path string, payload any, target any) error {
	var body []byte
	var err error
	if payload != nil {
		body, err = common.Marshal(payload)
		if err != nil {
			return err
		}
	}
	base := c.baseURL
	if base == "" {
		base = "https://api.weixin.qq.com"
	}
	req, err := http.NewRequestWithContext(ctx, method, base+path, bytes.NewReader(body))
	if err != nil {
		return errors.New("WeChat request creation failed")
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := c.http.Do(req)
	// Do not propagate URL-bearing errors: the URL contains an access token or secret.
	if err != nil {
		return errors.New("WeChat network request failed")
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("WeChat HTTP status %d", res.StatusCode)
	}
	if err := common.DecodeJson(http.MaxBytesReader(nil, res.Body, 64*1024), target); err != nil {
		return errors.New("Invalid WeChat response")
	}
	return nil
}

func (c *weChatTemplateClient) accessToken(ctx context.Context, config model.WeChatOrderConfig) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.appID == config.AppID && c.secret == config.AppSecret && c.token != "" && time.Now().Before(c.expires) {
		return c.token, nil
	}
	// Coordinate refreshes through the shared primary database. Test accounts may
	// not support stable_token, so fall back to the original token endpoint.
	type tokenCache struct {
		Identity string
		Token    string
		Expires  int64
	}
	identity := fmt.Sprintf("%x", sha256.Sum256([]byte(config.AppID+":"+config.AppSecret)))
	var cached tokenCache
	err := model.UpdateWeChatAccessToken(ctx, func(value string) (string, error) {
		if value != "" {
			_ = common.UnmarshalJsonStr(value, &cached)
		}
		if cached.Identity == identity && cached.Token != "" && cached.Expires > common.GetTimestamp() {
			return value, nil
		}
		var result struct {
			Token     string `json:"access_token"`
			ExpiresIn int    `json:"expires_in"`
			Code      int    `json:"errcode"`
		}
		err := c.request(ctx, http.MethodPost, "/cgi-bin/stable_token", map[string]any{
			"grant_type": "client_credential", "appid": config.AppID, "secret": config.AppSecret, "force_refresh": false,
		}, &result)
		if err != nil {
			return "", err
		}
		if result.Code == 48001 {
			result.Code = 0
			err = c.request(ctx, http.MethodGet, "/cgi-bin/token?grant_type=client_credential&appid="+url.QueryEscape(config.AppID)+"&secret="+url.QueryEscape(config.AppSecret), nil, &result)
			if err != nil {
				return "", err
			}
		}
		if result.Code != 0 {
			return "", &weChatAPIError{result.Code}
		}
		if result.Token == "" || result.ExpiresIn <= 0 {
			return "", errors.New("Invalid WeChat token response")
		}
		cached = tokenCache{Identity: identity, Token: result.Token, Expires: common.GetTimestamp() + int64(max(0, result.ExpiresIn-120))}
		encoded, err := common.Marshal(cached)
		if err != nil {
			return "", err
		}
		return string(encoded), nil
	})
	if err != nil {
		var apiErr *weChatAPIError
		if errors.As(err, &apiErr) {
			return "", apiErr
		}
		return "", errors.New("WeChat token acquisition failed")
	}
	c.appID, c.secret, c.token = config.AppID, config.AppSecret, cached.Token
	c.expires = time.Unix(cached.Expires, 0)
	return c.token, nil
}

func (c *weChatTemplateClient) send(ctx context.Context, config model.WeChatOrderConfig, entry model.WeChatOrderNotification) error {
	if config.AppID != entry.AppID {
		return errors.New("WeChat application changed; delivery paused")
	}
	for range 2 {
		token, err := c.accessToken(ctx, config)
		if err != nil {
			return err
		}
		var result struct {
			Code      int   `json:"errcode"`
			MessageID int64 `json:"msgid"`
		}
		err = c.request(ctx, http.MethodPost, "/cgi-bin/message/template/send?access_token="+url.QueryEscape(token), map[string]any{
			"touser": entry.Recipient, "template_id": entry.TemplateID,
			"data": map[string]any{
				"order_no":   map[string]string{"value": entry.TradeNo},
				"amount":     map[string]string{"value": entry.Amount},
				"order_time": map[string]string{"value": time.Unix(entry.OrderTime, 0).In(time.FixedZone("UTC+8", 8*3600)).Format("2006-01-02 15:04:05 +08:00")},
			},
		}, &result)
		if err != nil {
			return err
		}
		if result.Code == 40001 || result.Code == 40014 || result.Code == 42001 {
			c.mu.Lock()
			if c.token == token {
				c.token = ""
			}
			var option model.Option
			if model.DB.Where(&model.Option{Key: "WeChatOrderAccessToken"}).First(&option).Error == nil {
				var cached struct{ Token string }
				if common.UnmarshalJsonStr(option.Value, &cached) == nil && cached.Token == token {
					model.DB.Model(&model.Option{}).Where(&model.Option{Key: option.Key}).Where("value = ?", option.Value).Update("value", "")
				}
			}
			c.mu.Unlock()
			continue
		}
		if result.Code != 0 {
			return &weChatAPIError{result.Code}
		}
		if result.MessageID == 0 {
			return errors.New("Invalid WeChat send response")
		}
		return nil
	}
	return errors.New("WeChat token refresh failed")
}

func SendWeChatOrderTest(ctx context.Context) error {
	config := model.GetWeChatOrderConfig()
	config.Enabled = true
	if err := config.Validate(); err != nil {
		return err
	}
	for _, recipient := range strings.Split(config.Recipients, ",") {
		if err := weChatOrderClient.send(ctx, config, model.WeChatOrderNotification{AppID: config.AppID,
			Recipient: recipient, TemplateID: config.TemplateID, TradeNo: "TEST-" + time.Now().Format("20060102150405"),
			Amount: "0.00", OrderTime: common.GetTimestamp()}); err != nil {
			return err
		}
	}
	return nil
}

func StartWeChatOrderNotificationWorker() {
	go func() {
		for {
			if err := runWeChatOrderNotifications(context.Background()); err != nil {
				common.SysError(common.LogText("WeChat order notification worker failed: %s", err.Error()))
			}
			time.Sleep(5 * time.Second)
		}
	}()
}

func runWeChatOrderNotifications(ctx context.Context) error {
	config := model.GetWeChatOrderConfig()
	if !config.Enabled {
		return nil
	}
	now := common.GetTimestamp()
	var entries []model.WeChatOrderNotification
	if err := model.DB.Where("status IN ? AND next_attempt <= ?", []string{"pending", "sending"}, now).Order("id ASC").Limit(20).Find(&entries).Error; err != nil {
		return err
	}
	for _, entry := range entries {
		claimed, err := model.ClaimWeChatOrderNotification(&entry, common.GetTimestamp())
		if err != nil {
			return err
		}
		if !claimed {
			continue
		}
		err = weChatOrderClient.send(ctx, config, entry)
		status, reason := "sent", ""
		if err != nil {
			status, reason = "pending", err.Error()
			var apiErr *weChatAPIError
			permanent := errors.As(err, &apiErr) && (apiErr.Code == 40003 || apiErr.Code == 43004 || apiErr.Code == 40037)
			if permanent || entry.Attempts >= 8 {
				status = "failed"
			}
		}
		result := model.DB.Model(&model.WeChatOrderNotification{}).
			Where("id = ? AND status = ? AND next_attempt = ? AND attempts = ?", entry.ID, "sending", entry.NextAttempt, entry.Attempts).
			Updates(map[string]any{"status": status, "last_error": reason, "next_attempt": common.GetTimestamp() + min(int64(3600), int64(15)<<min(entry.Attempts, 8))})
		if result.Error != nil {
			return result.Error
		}
	}
	return nil
}
