/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
export type IPScope = 'registration' | 'login'

export type UserIPRisk = {
  id: number
  username: string
  display_name: string
  email: string
  registration_ip: string
  last_login_ip: string
  registration_ip_count: number
  last_login_ip_count: number
  registration_ip_blocked: boolean
  last_login_ip_blocked: boolean
  status: number
  role: number
  quota: number
  created_at: number
  last_login_at: number
}

export type UserIPRiskSortBy =
  | 'id'
  | 'created_at'
  | 'last_login_at'
  | 'registration_ip_count'
  | 'last_login_ip_count'

export type UserIPRiskListResponse = {
  success: boolean
  message?: string
  data?: {
    items: UserIPRisk[]
    total: number
    page: number
    page_size: number
  }
}

export type UserIPRiskListParams = {
  p: number
  page_size: number
  keyword?: string
  sort_by?: UserIPRiskSortBy
  sort_order?: 'asc' | 'desc'
}

export type IPAction =
  | { kind: 'block'; ips: string[] }
  | { kind: 'disable'; users: UserIPRisk[] }
