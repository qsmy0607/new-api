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

import { getDefaultTimeRange } from '../utils'

describe('usage log default time range', () => {
  test('covers the full local day', () => {
    const range = getDefaultTimeRange(new Date(2026, 9, 27, 10, 14, 19))

    expect(range.start).toEqual(new Date(2026, 9, 27, 0, 0, 0, 0))
    expect(range.end).toEqual(new Date(2026, 9, 27, 23, 59, 59, 999))
  })
})
