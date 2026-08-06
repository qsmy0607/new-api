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
import { describe, test } from 'node:test'

import { buildSearchParams } from '../filter'
import {
  buildApiParams,
  buildBaseParams,
  getMillisecondsUntilNextDay,
  parseLogTimeSelection,
  resolveLogTimeRange,
} from '../utils'

describe('usage log time ranges', () => {
  test('rolls the default today preset to the reference day', () => {
    const selection = parseLogTimeSelection({})
    const augustFifth = resolveLogTimeRange(
      selection,
      new Date(2026, 7, 5, 20, 0, 0)
    )
    const augustSixth = resolveLogTimeRange(
      selection,
      new Date(2026, 7, 6, 0, 0, 1)
    )

    assert.deepEqual(selection, { kind: 'preset', preset: 'today' })
    assert.equal(augustFifth.start?.getDate(), 5)
    assert.equal(augustFifth.end?.getDate(), 5)
    assert.equal(augustSixth.start?.getDate(), 6)
    assert.equal(augustSixth.end?.getDate(), 6)
    assert.equal(augustSixth.start?.getHours(), 0)
    assert.equal(augustSixth.start?.getMilliseconds(), 0)
    assert.equal(augustSixth.end?.getHours(), 23)
    assert.equal(augustSixth.end?.getMilliseconds(), 999)
  })

  test('keeps legacy timestamp URLs fixed across day changes', () => {
    const startTime = new Date(2026, 7, 5, 0, 0, 0).getTime()
    const endTime = new Date(2026, 7, 5, 23, 59, 59, 999).getTime()
    const selection = parseLogTimeSelection({
      rangePreset: 'today',
      startTime,
      endTime,
    })
    const resolved = resolveLogTimeRange(
      selection,
      new Date(2026, 7, 6, 12, 0, 0)
    )

    assert.equal(selection.kind, 'custom')
    assert.equal(resolved.start?.getTime(), startTime)
    assert.equal(resolved.end?.getTime(), endTime)
  })

  test('serializes relative presets without freezing their timestamps', () => {
    assert.deepEqual(
      buildSearchParams(
        { timeRange: { kind: 'preset', preset: 'today' } },
        'common'
      ),
      {}
    )
    assert.deepEqual(
      buildSearchParams(
        { timeRange: { kind: 'preset', preset: 'last7Days' } },
        'common'
      ),
      { rangePreset: 'last7Days' }
    )
  })

  test('serializes custom ranges as fixed timestamps', () => {
    const start = new Date(2026, 7, 5, 1, 2, 3)
    const end = new Date(2026, 7, 5, 4, 5, 6)

    assert.deepEqual(
      buildSearchParams({ timeRange: { kind: 'custom', start, end } }, 'task'),
      { startTime: start.getTime(), endTime: end.getTime() }
    )
  })

  test('preserves second and millisecond API precision', () => {
    const timeRange = {
      start: new Date(2026, 7, 5, 0, 0, 0, 0),
      end: new Date(2026, 7, 5, 23, 59, 59, 999),
    }
    const commonParams = buildApiParams({
      page: 1,
      pageSize: 20,
      searchParams: {},
      timeRange,
      isAdmin: false,
    })
    const drawingParams = buildBaseParams({
      page: 1,
      pageSize: 20,
      searchParams: {},
      timeRange,
      useMilliseconds: true,
    })

    assert.equal(
      commonParams.start_timestamp,
      Math.floor(timeRange.start.getTime() / 1000)
    )
    assert.equal(
      commonParams.end_timestamp,
      Math.floor(timeRange.end.getTime() / 1000)
    )
    assert.equal(drawingParams.start_timestamp, timeRange.start.getTime())
    assert.equal(drawingParams.end_timestamp, timeRange.end.getTime())
  })

  test('schedules the day rollover at the next local midnight', () => {
    assert.equal(
      getMillisecondsUntilNextDay(new Date(2026, 7, 5, 23, 59, 59, 500)),
      500
    )
  })
})
