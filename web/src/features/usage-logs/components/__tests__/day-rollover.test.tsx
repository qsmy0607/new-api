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

import { afterAll, describe, test } from 'vitest'

const NativeDate = Date
let currentTime = new NativeDate(2026, 7, 5, 23, 59, 59, 900).getTime()

class ControlledDate extends NativeDate {
  constructor(value?: string | number | Date) {
    if (value === undefined) {
      super(currentTime)
      return
    }
    super(value instanceof NativeDate ? value.getTime() : value)
  }

  static now() {
    return currentTime
  }
}

Object.defineProperty(globalThis, 'Date', {
  configurable: true,
  value: ControlledDate,
})

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { UsageLogsProvider, useUsageLogsContext } =
  await import('../usage-logs-provider')
const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

function CurrentDayProbe() {
  const { currentDayStart } = useUsageLogsContext()
  return <span>{new NativeDate(currentDayStart).getDate()}</span>
}

describe('usage logs day rollover', () => {
  afterAll(() => {
    Object.defineProperty(globalThis, 'Date', {
      configurable: true,
      value: NativeDate,
    })
  })

  test('updates the current day when a background page becomes visible', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <UsageLogsProvider>
          <CurrentDayProbe />
        </UsageLogsProvider>
      )
    })
    assert.equal(container.textContent, '5')

    currentTime = new NativeDate(2026, 7, 6, 0, 0, 0, 100).getTime()
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    assert.equal(container.textContent, '6')

    await act(async () => root.unmount())
    container.remove()
  })
})
