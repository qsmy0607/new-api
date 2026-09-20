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
import { describe, expect, test } from 'vitest'

import { manageableUsers, uniqueIPs } from '../lib/ip-actions'
import type { UserIPRisk } from '../types'

function user(id: number, role = 1, status = 1): UserIPRisk {
  return {
    id,
    username: `user-${id}`,
    display_name: `User ${id}`,
    email: '',
    registration_ip: '203.0.113.10',
    last_login_ip: '',
    registration_ip_count: 1,
    last_login_ip_count: 0,
    registration_ip_blocked: false,
    last_login_ip_blocked: false,
    status,
    role,
    quota: 0,
    created_at: 1,
    last_login_at: 0,
  }
}

describe('IP restriction action selection', () => {
  test('keeps only unique enabled users below the operator role', () => {
    const result = manageableUsers(
      [user(1), user(1), user(2, 1, 2), user(3, 10), user(4, 1)],
      10
    )

    expect(result.map((item) => item.id)).toEqual([1, 4])
  })

  test('normalizes the selected exact IP list', () => {
    expect(uniqueIPs([' 203.0.113.10 ', '', '203.0.113.10'])).toEqual([
      '203.0.113.10',
    ])
  })
})
