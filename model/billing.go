/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/
package model

import (
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
)

var onlineBillingProviders = []string{
	PaymentProviderEpay,
	PaymentProviderStripe,
	PaymentProviderCreem,
	PaymentProviderWaffo,
	PaymentProviderWaffoPancake,
}

type BillingRecord struct {
	Id              int     `json:"id"`
	UserId          int     `json:"user_id"`
	Username        string  `json:"username"`
	CreatedAt       int64   `json:"created_at"`
	Type            int     `json:"type"`
	Content         string  `json:"content"`
	PaymentAmount   float64 `json:"payment_amount"`
	BillingType     string  `json:"billing_type"`
	PaymentProvider string  `json:"payment_provider"`
	PaymentMethod   string  `json:"payment_method"`
	TradeNo         string  `json:"trade_no"`
	Amount          int64   `json:"amount"`
	Status          string  `json:"status"`
}

type BillingStatistics struct {
	Amount     float64 `json:"amount"`
	OrderCount int64   `json:"order_count"`
}

func billingProviderPlaceholders() string {
	return strings.TrimRight(strings.Repeat("?,", len(onlineBillingProviders)), ",")
}

func billingUnionSQL(userId int, startTimestamp int64, endTimestamp int64) (string, []interface{}) {
	providers := billingProviderPlaceholders()
	topUp := fmt.Sprintf(`
		SELECT t.id AS id, t.user_id AS user_id, COALESCE(u.username, '') AS username, t.complete_time AS created_at,
		       %d AS type, 'Online quota top-up' AS content, t.money AS payment_amount, 'quota_topup' AS billing_type,
		       t.payment_provider AS payment_provider, t.payment_method AS payment_method, t.trade_no AS trade_no, t.amount AS amount, t.status AS status
		FROM top_ups t
		LEFT JOIN users u ON u.id = t.user_id
		WHERE t.status = ? AND t.payment_provider IN (%s) AND t.complete_time > 0
		  AND NOT EXISTS (
			SELECT 1 FROM subscription_orders so
			WHERE so.trade_no = t.trade_no AND so.status = ?
		  )`, LogTypeBilling, providers)
	subscription := fmt.Sprintf(`
		SELECT s.id AS id, s.user_id AS user_id, COALESCE(u.username, '') AS username, s.complete_time AS created_at,
		       %d AS type, 'Online subscription payment' AS content, s.money AS payment_amount, 'subscription' AS billing_type,
		       s.payment_provider AS payment_provider, s.payment_method AS payment_method, s.trade_no AS trade_no, 0 AS amount, s.status AS status
		FROM subscription_orders s
		LEFT JOIN users u ON u.id = s.user_id
		WHERE s.status = ? AND s.payment_provider IN (%s) AND s.complete_time > 0`, LogTypeBilling, providers)

	args := make([]interface{}, 0, 20)
	args = append(args, common.TopUpStatusSuccess)
	for _, provider := range onlineBillingProviders {
		args = append(args, provider)
	}
	args = append(args, common.TopUpStatusSuccess)
	args = append(args, common.TopUpStatusSuccess)
	for _, provider := range onlineBillingProviders {
		args = append(args, provider)
	}

	filters := []string{}
	if userId > 0 {
		filters = append(filters, "user_id = ?")
		args = append(args, userId)
	}
	if startTimestamp != 0 {
		filters = append(filters, "created_at >= ?")
		args = append(args, startTimestamp)
	}
	if endTimestamp != 0 {
		filters = append(filters, "created_at <= ?")
		args = append(args, endTimestamp)
	}
	filterSQL := ""
	if len(filters) > 0 {
		filterSQL = " WHERE " + strings.Join(filters, " AND ")
	}
	union := "SELECT id, user_id, username, created_at, type, content, payment_amount, billing_type, payment_provider, payment_method, trade_no, amount, status FROM (" + topUp + " UNION ALL " + subscription + ") billing_source" + filterSQL
	return union, args
}

func GetBillingRecords(userId int, startTimestamp int64, endTimestamp int64, startIdx int, pageSize int) (records []*BillingRecord, total int64, err error) {
	union, args := billingUnionSQL(userId, startTimestamp, endTimestamp)
	if err = DB.Raw("SELECT COUNT(*) FROM ("+union+") billing_count", args...).Scan(&total).Error; err != nil {
		return nil, 0, err
	}
	queryArgs := append(append([]interface{}{}, args...), pageSize, startIdx)
	query := "SELECT id, user_id, username, created_at, type, content, payment_amount, billing_type, payment_provider, payment_method, trade_no, amount, status FROM (" + union + ") billing ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?"
	err = DB.Raw(query, queryArgs...).Scan(&records).Error
	return records, total, err
}

func GetBillingStatistics(userId int, startTimestamp int64, endTimestamp int64) (stats BillingStatistics, err error) {
	union, args := billingUnionSQL(userId, startTimestamp, endTimestamp)
	query := "SELECT COALESCE(SUM(payment_amount), 0) AS amount, COUNT(*) AS order_count FROM (" + union + ") billing"
	err = DB.Raw(query, args...).Scan(&stats).Error
	return stats, err
}
