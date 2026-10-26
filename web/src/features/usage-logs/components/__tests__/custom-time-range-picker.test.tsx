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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { CustomDateTimeRangePicker } from '../custom-date-time-range-picker'

describe('custom log time range picker', () => {
  test('applies the full previous day from the quick ranges', async () => {
    const now = new Date()
    const expectedStart = new Date(now)
    expectedStart.setDate(expectedStart.getDate() - 1)
    expectedStart.setHours(0, 0, 0, 0)
    const expectedEnd = new Date(expectedStart)
    expectedEnd.setHours(23, 59, 59, 999)
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <CustomDateTimeRangePicker
        start={new Date(2026, 9, 26)}
        end={new Date(2026, 9, 26, 23, 59, 59)}
        onChange={onChange}
      />
    )

    await user.click(
      screen.getByRole('button', { name: 'Start Time: Select date' })
    )
    await user.click(screen.getByRole('button', { name: 'Yesterday' }))

    expect(onChange).toHaveBeenCalledWith({
      start: expectedStart,
      end: expectedEnd,
    })
  })

  test('opens separate hour, minute, and second selectors', async () => {
    render(
      <CustomDateTimeRangePicker
        start={new Date(2026, 9, 26, 1, 2, 3)}
        end={new Date(2026, 9, 26, 4, 5, 6)}
        onChange={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Start Time' }))

    expect(
      screen.getByRole('listbox', { name: 'Start Time Hour' })
    ).toBeVisible()
    expect(
      screen.getByRole('listbox', { name: 'Start Time Minute' })
    ).toBeVisible()
    expect(
      screen.getByRole('listbox', { name: 'Start Time Second' })
    ).toBeVisible()
    expect(
      screen.getByRole('listbox', { name: 'End Time Second' })
    ).toBeVisible()
  })
})
