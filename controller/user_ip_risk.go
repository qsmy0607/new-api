package controller

import (
	"errors"
	"net/netip"
	"sort"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
)

var registrationIPBlockUpdateMutex sync.Mutex

type relatedUsersByIPRequest struct {
	IPs   []string `json:"ips"`
	Scope string   `json:"scope"`
}

type blockRegistrationIPsRequest struct {
	IPs []string `json:"ips"`
}

func GetUserIPRisks(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	users, total, err := model.GetUserIPRisks(model.UserIPRiskQuery{
		Keyword:   c.Query("keyword"),
		SortBy:    c.Query("sort_by"),
		SortOrder: c.Query("sort_order"),
		Offset:    pageInfo.GetStartIdx(),
		Limit:     pageInfo.GetPageSize(),
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	for index := range users {
		users[index].RegistrationIPBlocked = setting.IsRegistrationIPBlocked(users[index].RegistrationIP)
		users[index].LastLoginIPBlocked = setting.IsRegistrationIPBlocked(users[index].LastLoginIP)
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(users)
	common.ApiSuccess(c, pageInfo)
}

func GetUsersRelatedByIP(c *gin.Context) {
	var request relatedUsersByIPRequest
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	if request.Scope != model.UserIPScopeRegistration && request.Scope != model.UserIPScopeLogin {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	ips, err := normalizeExactIPs(request.IPs)
	if err != nil || len(ips) == 0 {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	users, err := model.GetUsersRelatedByIPs(ips, request.Scope)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, users)
}

func BlockRegistrationIPs(c *gin.Context) {
	var request blockRegistrationIPsRequest
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	ips, err := normalizeExactIPs(request.IPs)
	if err != nil || len(ips) == 0 {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	registrationIPBlockUpdateMutex.Lock()
	defer registrationIPBlockUpdateMutex.Unlock()

	common.OptionMapRWMutex.RLock()
	current := common.OptionMap[setting.RegistrationIPBlacklistKey]
	common.OptionMapRWMutex.RUnlock()
	entries := strings.Fields(strings.ReplaceAll(current, "\r\n", "\n"))
	existing := make(map[string]struct{}, len(entries)+len(ips))
	for _, entry := range entries {
		existing[entry] = struct{}{}
	}
	added := make([]string, 0, len(ips))
	for _, ip := range ips {
		if setting.IsRegistrationIPBlocked(ip) {
			continue
		}
		if _, ok := existing[ip]; ok {
			continue
		}
		existing[ip] = struct{}{}
		entries = append(entries, ip)
		added = append(added, ip)
	}
	sort.Strings(entries)
	if err := model.UpdateOptionsBulk(map[string]string{
		setting.RegistrationIPBlacklistKey:        strings.Join(entries, "\n"),
		setting.RegistrationIPBlacklistEnabledKey: "true",
	}); err != nil {
		common.ApiError(c, err)
		return
	}
	recordManageAudit(c, "registration_ip.block", map[string]interface{}{
		"ips":   ips,
		"added": added,
	})
	common.ApiSuccess(c, gin.H{
		"added":   added,
		"blocked": ips,
	})
}

func normalizeExactIPs(values []string) ([]string, error) {
	unique := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		address, err := netip.ParseAddr(strings.TrimSpace(value))
		if err != nil || address.Zone() != "" {
			if err == nil {
				err = errors.New("zoned IP addresses are not supported")
			}
			return nil, err
		}
		normalized := address.Unmap().String()
		if _, ok := unique[normalized]; ok {
			continue
		}
		unique[normalized] = struct{}{}
		result = append(result, normalized)
	}
	sort.Strings(result)
	return result, nil
}
