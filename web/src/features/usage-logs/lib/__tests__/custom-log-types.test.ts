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

import { ADMIN_ONLY_LOG_TYPES, LOG_TYPE_FILTERS } from '../../constants'
import { buildApiParams } from '../utils'

describe('custom usage log types', () => {
  test.each([
    ['Subscription', '8'],
    ['Payment Billing', '9'],
  ])('offers %s as a log type filter', (label, value) => {
    expect(LOG_TYPE_FILTERS).toContainEqual({
      label,
      value,
      deprecated: false,
    })
  })

  test('sends the subscription filter value to the log API', () => {
    const params = buildApiParams({
      page: 1,
      pageSize: 20,
      searchParams: { type: ['8'] },
      columnFilters: [],
      isAdmin: false,
    })

    expect(params.type).toBe(8)
  })

  test('keeps billing logs admin-only', () => {
    expect(ADMIN_ONLY_LOG_TYPES).toContain(9)
  })
})
