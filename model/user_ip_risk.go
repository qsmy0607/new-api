package model

import (
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	UserIPScopeRegistration = "registration"
	UserIPScopeLogin        = "login"
)

type UserIPRisk struct {
	Id                    int    `json:"id"`
	Username              string `json:"username"`
	DisplayName           string `json:"display_name"`
	Email                 string `json:"email"`
	RegistrationIP        string `json:"registration_ip"`
	LastLoginIP           string `json:"last_login_ip"`
	RegistrationIPCount   int64  `json:"registration_ip_count"`
	LastLoginIPCount      int64  `json:"last_login_ip_count"`
	RegistrationIPBlocked bool   `json:"registration_ip_blocked" gorm:"-"`
	LastLoginIPBlocked    bool   `json:"last_login_ip_blocked" gorm:"-"`
	Status                int    `json:"status"`
	Role                  int    `json:"role"`
	Quota                 int    `json:"quota"`
	CreatedAt             int64  `json:"created_at"`
	LastLoginAt           int64  `json:"last_login_at"`
}

type UserIPRiskQuery struct {
	Keyword   string
	SortBy    string
	SortOrder string
	Offset    int
	Limit     int
}

func userIPRiskBaseQuery(query UserIPRiskQuery) *gorm.DB {
	db := DB.Table("users AS users").Where("users.deleted_at IS NULL")
	keyword := strings.TrimSpace(query.Keyword)
	if keyword == "" {
		return db
	}
	pattern := "%" + strings.ToLower(keyword) + "%"
	return db.Where(
		"LOWER(users.username) LIKE ? OR LOWER(users.email) LIKE ? OR LOWER(users.registration_ip) LIKE ? OR LOWER(users.last_login_ip) LIKE ?",
		pattern,
		pattern,
		pattern,
		pattern,
	)
}

func GetUserIPRisks(query UserIPRiskQuery) ([]UserIPRisk, int64, error) {
	var total int64
	if err := userIPRiskBaseQuery(query).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	registrationCounts := DB.Table("users").
		Select("registration_ip, COUNT(*) AS registration_ip_count").
		Where("deleted_at IS NULL AND registration_ip <> ?", "").
		Group("registration_ip")
	loginCounts := DB.Table("users").
		Select("last_login_ip, COUNT(*) AS last_login_ip_count").
		Where("deleted_at IS NULL AND last_login_ip <> ?", "").
		Group("last_login_ip")

	db := userIPRiskBaseQuery(query).
		Select(`users.id, users.username, users.display_name, users.email,
			users.registration_ip, users.last_login_ip, users.status, users.role,
			users.quota, users.created_at, users.last_login_at,
			COALESCE(registration_counts.registration_ip_count, 0) AS registration_ip_count,
			COALESCE(login_counts.last_login_ip_count, 0) AS last_login_ip_count`).
		Joins("LEFT JOIN (?) AS registration_counts ON registration_counts.registration_ip = users.registration_ip", registrationCounts).
		Joins("LEFT JOIN (?) AS login_counts ON login_counts.last_login_ip = users.last_login_ip", loginCounts)

	sortColumns := map[string]clause.Column{
		"id":                    {Table: "users", Name: "id"},
		"created_at":            {Table: "users", Name: "created_at"},
		"last_login_at":         {Table: "users", Name: "last_login_at"},
		"registration_ip_count": {Name: "registration_ip_count"},
		"last_login_ip_count":   {Name: "last_login_ip_count"},
	}
	sortColumn, ok := sortColumns[strings.ToLower(strings.TrimSpace(query.SortBy))]
	if !ok {
		sortColumn = sortColumns["id"]
	}
	descending := !strings.EqualFold(strings.TrimSpace(query.SortOrder), "asc")
	db = db.Order(clause.OrderByColumn{Column: sortColumn, Desc: descending})
	if sortColumn.Name != "id" {
		db = db.Order(clause.OrderByColumn{Column: sortColumns["id"], Desc: true})
	}

	var users []UserIPRisk
	if err := db.Offset(query.Offset).Limit(query.Limit).Scan(&users).Error; err != nil {
		return nil, 0, err
	}
	return users, total, nil
}

func GetUsersRelatedByIPs(ips []string, scope string) ([]UserIPRisk, error) {
	column := "registration_ip"
	if scope == UserIPScopeLogin {
		column = "last_login_ip"
	}
	values := make([]interface{}, len(ips))
	for index, ip := range ips {
		values[index] = ip
	}
	var users []UserIPRisk
	err := DB.Table("users").
		Select("id, username, display_name, email, registration_ip, last_login_ip, status, role, quota, created_at, last_login_at").
		Where("deleted_at IS NULL").
		Where(clause.IN{Column: clause.Column{Name: column}, Values: values}).
		Order(clause.OrderByColumn{Column: clause.Column{Name: "id"}, Desc: true}).
		Scan(&users).Error
	return users, err
}
