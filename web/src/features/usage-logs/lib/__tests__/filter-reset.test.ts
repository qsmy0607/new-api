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

import type { CommonLogFilters, TaskLogFilters } from '../../types'
import { canResetCommonLogFilters, canResetTaskLogFilters } from '../filter'

const defaultCommonFilters: CommonLogFilters = {
  timeRange: { kind: 'preset', preset: 'today' },
}
const defaultTaskFilters: TaskLogFilters = {
  timeRange: { kind: 'preset', preset: 'today' },
}

describe('usage log filter reset availability', () => {
  test('stays enabled until an applied common filter is reset', () => {
    const appliedFilters: CommonLogFilters = {
      ...defaultCommonFilters,
      model: 'gpt-5',
    }

    assert.equal(
      canResetCommonLogFilters(defaultCommonFilters, '0', appliedFilters, [
        '0',
      ]),
      true
    )
  })

  test('treats a legacy multi-value type as resettable', () => {
    assert.equal(
      canResetCommonLogFilters(
        defaultCommonFilters,
        '0',
        defaultCommonFilters,
        ['0', '2']
      ),
      true
    )
  })

  test('is disabled when common draft and applied filters are both default', () => {
    assert.equal(
      canResetCommonLogFilters(
        defaultCommonFilters,
        '0',
        defaultCommonFilters,
        ['0']
      ),
      false
    )
  })

  test('stays enabled until an applied task filter is reset', () => {
    const appliedFilters: TaskLogFilters = {
      ...defaultTaskFilters,
      taskId: 'task-123',
    }

    assert.equal(
      canResetTaskLogFilters(defaultTaskFilters, appliedFilters, 'task'),
      true
    )
  })
})
