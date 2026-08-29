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

import { render } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { Calendar } from '../ui/calendar'

afterEach(() => {
  vi.useRealTimers()
})

test.each([
  ['outside the selected range', new Date(2026, 7, 1), new Date(2026, 7, 15)],
  ['the range start', new Date(2026, 7, 21), new Date(2026, 7, 25)],
  ['the range end', new Date(2026, 7, 1), new Date(2026, 7, 21)],
  ['within the selected range', new Date(2026, 7, 1), new Date(2026, 7, 31)],
])('today remains highlighted when it is %s', (_, from, to) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 7, 21, 12))

  const { container } = render(
    <Calendar
      mode='range'
      month={new Date(2026, 7, 1)}
      selected={{ from, to }}
    />
  )
  const today = container.querySelector<HTMLButtonElement>(
    'button[data-today="true"]'
  )

  assert.ok(today)
  assert.equal(today.dataset.today, 'true')
  assert.equal(today.classList.contains('data-[today=true]:ring-2'), true)
})
