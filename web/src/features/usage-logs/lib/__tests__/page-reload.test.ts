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
import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import { shouldResetUsageLogsPageOnReload } from '../page-reload'

describe('usage logs page reload', () => {
  test('resets a later page on the initial browser reload', () => {
    assert.equal(
      shouldResetUsageLogsPageOnReload({
        initialLoadHandled: false,
        initialPathname: '/usage-logs/common',
        currentPathname: '/usage-logs/common',
        page: 3,
        wasReload: true,
      }),
      true
    )
  })

  test('keeps the page during client-side navigation', () => {
    assert.equal(
      shouldResetUsageLogsPageOnReload({
        initialLoadHandled: false,
        initialPathname: '/dashboard',
        currentPathname: '/usage-logs/common',
        page: 3,
        wasReload: true,
      }),
      false
    )
  })

  test('does not reset the page after the initial load was handled', () => {
    assert.equal(
      shouldResetUsageLogsPageOnReload({
        initialLoadHandled: true,
        initialPathname: '/usage-logs/common',
        currentPathname: '/usage-logs/common',
        page: 3,
        wasReload: true,
      }),
      false
    )
  })
})
