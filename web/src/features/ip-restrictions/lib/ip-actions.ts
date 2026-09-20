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
import { USER_STATUS } from '@/features/users/constants'

import type { UserIPRisk } from '../types'

export function uniqueIPs(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

export function manageableUsers(
  users: UserIPRisk[],
  currentRole: number
): UserIPRisk[] {
  const seen = new Set<number>()
  return users.filter((user) => {
    if (
      seen.has(user.id) ||
      user.status !== USER_STATUS.ENABLED ||
      user.role >= currentRole
    ) {
      return false
    }
    seen.add(user.id)
    return true
  })
}
