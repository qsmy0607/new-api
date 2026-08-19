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
import { after, test } from 'node:test'

import { Window } from 'happy-dom'

import type { LogTimeSelection } from '../../types'

const domWindow = new Window()
const domGlobals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLButtonElement',
  'HTMLInputElement',
  'SVGElement',
  'Node',
  'Element',
  'Event',
  'PointerEvent',
  'MouseEvent',
  'FocusEvent',
  'CustomEvent',
  'MutationObserver',
  'ResizeObserver',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'getComputedStyle',
] as const

for (const key of domGlobals) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: domWindow[key],
  })
}

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { CompactDateTimeRangePicker } =
  await import('../compact-date-time-range-picker')

const enTranslation = {
  'Date Range': 'Date Range',
  'Start Time': 'Start Time',
  'End Time': 'End Time',
  Hour: 'Hour',
  Minute: 'Minute',
  Second: 'Second',
  'Select date': 'Select date',
  'Select time': 'Select time',
  'Previous month': 'Previous month',
  'Previous year': 'Previous year',
  'Next month': 'Next month',
  'Next year': 'Next year',
  Today: 'Today',
  'Previous day to date': 'Previous day to date',
  Yesterday: 'Yesterday',
  'This month': 'This month',
  'Previous month to date': 'Previous month to date',
  '30 days': '30 days',
}

const zhTranslation = {
  'Date Range': '时间范围',
  'Start Time': '起始时间',
  'End Time': '结束时间',
  Hour: '小时',
  Minute: '分钟',
  Second: '秒',
  'Select date': '选择日期',
  'Select time': '选择时间',
  'Previous month': '上个月',
  'Previous year': '上一年',
  'Next month': '下个月',
  'Next year': '下一年',
}

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

after(() => {
  domWindow.close()
})

async function renderPicker(
  language: 'en' | 'zh-CN',
  onChange: (selection: LogTimeSelection) => void
) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({
    lng: language,
    fallbackLng: 'en',
    resources: {
      en: { translation: enTranslation },
      zh: { translation: zhTranslation },
      'zh-CN': { translation: zhTranslation },
    },
  })

  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(
      <I18nextProvider i18n={i18n}>
        <CompactDateTimeRangePicker
          start={new Date(2026, 7, 1, 0, 0, 0)}
          end={new Date(2026, 7, 15, 0, 0, 0)}
          onChange={onChange}
          showQuickRanges
        />
      </I18nextProvider>
    )
  })

  return { container, root }
}

async function cleanupPicker(
  root: ReturnType<typeof createRoot>,
  container: HTMLDivElement
) {
  await act(async () => root.unmount())
  container.remove()
}

test('selecting a calendar day immediately updates the filter range', async () => {
  const changes: LogTimeSelection[] = []
  const { container, root } = await renderPicker('en', (selection) =>
    changes.push(selection)
  )

  const dateTrigger = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Start Time: Select date"]'
  )
  const timeTrigger = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Start Time"]'
  )
  assert.ok(dateTrigger)
  assert.ok(timeTrigger)
  assert.equal(dateTrigger.textContent, '2026-08-01')
  assert.equal(timeTrigger.textContent, '00:00:00')
  assert.equal(
    container.querySelector<HTMLButtonElement>(
      'button[aria-label="End Time: Select date"]'
    )?.textContent,
    '2026-08-15'
  )
  assert.equal(
    container.querySelector<HTMLButtonElement>('button[aria-label="End Time"]')
      ?.textContent,
    '00:00:00'
  )
  await act(async () => dateTrigger.click())

  assert.equal(
    document.querySelectorAll('[data-slot="calendar"] table').length,
    2
  )
  assert.equal(document.querySelectorAll('input').length, 0)
  assert.equal(document.body.textContent?.includes('Confirm'), false)

  const selectedDay = document.querySelector<HTMLButtonElement>(
    'button[data-day="8/10/2026"]'
  )
  assert.ok(selectedDay)
  await act(async () => selectedDay.click())

  const selection = changes.at(-1)
  assert.equal(selection?.kind, 'custom')
  if (selection?.kind === 'custom') {
    assert.equal(selection.start?.getFullYear(), 2026)
    assert.equal(selection.start?.getMonth(), 7)
    assert.equal(selection.start?.getDate(), 10)
    assert.equal(selection.end, undefined)
  }

  await cleanupPicker(root, container)
})

test('calendar trigger regions toggle the calendar', async () => {
  const { container, root } = await renderPicker('en', () => undefined)
  const picker = container.querySelector<HTMLDivElement>('[role="group"]')
  const startDateTrigger = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Start Time: Select date"]'
  )
  const endDateTrigger = container.querySelector<HTMLButtonElement>(
    'button[aria-label="End Time: Select date"]'
  )
  assert.ok(picker)
  assert.ok(startDateTrigger)
  assert.ok(endDateTrigger)

  await act(async () => {
    picker.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    picker.click()
  })
  assert.equal(startDateTrigger.getAttribute('aria-expanded'), 'true')

  await act(async () => {
    picker.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    picker.click()
  })
  assert.equal(startDateTrigger.getAttribute('aria-expanded'), 'false')

  await act(async () => {
    startDateTrigger.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true })
    )
    startDateTrigger.click()
  })
  assert.equal(startDateTrigger.getAttribute('aria-expanded'), 'true')

  await act(async () => {
    startDateTrigger.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true })
    )
    startDateTrigger.click()
  })
  assert.equal(startDateTrigger.getAttribute('aria-expanded'), 'false')

  await act(async () => {
    endDateTrigger.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true })
    )
    endDateTrigger.click()
  })
  assert.equal(startDateTrigger.getAttribute('aria-expanded'), 'true')

  await act(async () => {
    endDateTrigger.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true })
    )
    endDateTrigger.click()
  })
  assert.equal(startDateTrigger.getAttribute('aria-expanded'), 'false')
  await cleanupPicker(root, container)
})

test('calendar quick ranges immediately apply the selected preset', async () => {
  const quickRanges = [
    ['Today', 'today', 'preset'],
    ['Previous day to date', 'previousDayToDate', 'custom'],
    ['Yesterday', 'yesterday', 'preset'],
    ['This month', 'thisMonth', 'preset'],
    ['Previous month to date', 'previousMonthToDate', 'custom'],
    ['30 days', 'last30Days', 'preset'],
  ] as const

  for (const [label, preset, selectionKind] of quickRanges) {
    const changes: LogTimeSelection[] = []
    const { container, root } = await renderPicker('en', (selection) =>
      changes.push(selection)
    )
    const dateTrigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Start Time: Select date"]'
    )
    assert.ok(dateTrigger)
    await act(async () => dateTrigger.click())

    const quickRangeButton = [
      ...document.querySelectorAll<HTMLButtonElement>('button'),
    ].find((button) => button.textContent === label)
    assert.ok(quickRangeButton)
    await act(async () => quickRangeButton.click())

    const selection = changes.at(-1)
    assert.equal(selection?.kind, selectionKind)
    if (selection?.kind === 'preset') {
      assert.equal(selection.preset, preset)
    } else {
      assert.ok(selection?.start)
      assert.ok(selection.end)
    }
    assert.equal(document.querySelector('[data-slot="calendar"]'), null)
    await cleanupPicker(root, container)
  }
})

test('calendar quick ranges use two narrow columns and three wide columns', async () => {
  const { container, root } = await renderPicker('en', () => {})
  const dateTrigger = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Start Time: Select date"]'
  )
  assert.ok(dateTrigger)
  await act(async () => dateTrigger.click())

  const todayButton = [
    ...document.querySelectorAll<HTMLButtonElement>('button'),
  ].find((button) => button.textContent === 'Today')
  assert.ok(todayButton)
  const quickRangeGrid = todayButton.parentElement
  assert.ok(quickRangeGrid)
  assert.equal(quickRangeGrid.classList.contains('grid-cols-2'), true)
  assert.equal(quickRangeGrid.classList.contains('sm:grid-cols-3'), true)

  await cleanupPicker(root, container)
})

test('selecting a time option immediately updates the filter time', async () => {
  const changes: LogTimeSelection[] = []
  const { container, root } = await renderPicker('en', (selection) =>
    changes.push(selection)
  )
  const timeTrigger = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Start Time"]'
  )
  assert.ok(timeTrigger)
  await act(async () => {
    timeTrigger.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true })
    )
    timeTrigger.click()
  })

  const timeColumns = document.querySelectorAll('[role="listbox"]')
  assert.equal(
    document.querySelectorAll('[data-slot="calendar"] table').length,
    0
  )
  assert.equal(timeColumns.length, 6)
  assert.equal(timeColumns[0]?.classList.contains('overflow-y-auto'), true)
  assert.equal(timeColumns[0]?.classList.contains('snap-y'), false)
  assert.deepEqual(
    Array.from(timeColumns, (column) => column.getAttribute('aria-label')),
    [
      'Start Time Hour',
      'Start Time Minute',
      'Start Time Second',
      'End Time Hour',
      'End Time Minute',
      'End Time Second',
    ]
  )
  assert.equal(document.body.textContent?.includes('Start Time'), false)
  assert.equal(document.body.textContent?.includes('End Time'), false)

  const startHour = timeColumns[0]
  const noonOption = [
    ...(startHour?.querySelectorAll<HTMLButtonElement>('[role="option"]') ??
      []),
  ].find((option) => option.textContent === '12')
  assert.ok(noonOption)
  await act(async () => noonOption.click())

  const selection = changes.at(-1)
  assert.equal(selection?.kind, 'custom')
  if (selection?.kind === 'custom') {
    assert.equal(selection.start?.getHours(), 12)
    assert.equal(selection.start?.getMinutes(), 0)
    assert.equal(selection.start?.getSeconds(), 0)
  }

  await cleanupPicker(root, container)
})

test('simplified Chinese calendar uses Chinese months and supports year navigation', async () => {
  const { container, root } = await renderPicker('zh-CN', () => undefined)
  const dateTrigger = container.querySelector<HTMLButtonElement>(
    'button[aria-label="起始时间: 选择日期"]'
  )
  assert.ok(dateTrigger)
  await act(async () => dateTrigger.click())

  const captions = document.querySelectorAll('.rdp-month_caption')
  assert.equal(captions.length, 2)
  assert.equal(
    [...captions].every((caption) => caption.textContent?.includes('月')),
    true
  )
  assert.equal(
    [...captions].every((caption) => caption.textContent?.includes('2026')),
    true
  )

  const nextYear = document.querySelector<HTMLButtonElement>(
    'button[aria-label="下一年"]'
  )
  assert.ok(nextYear)
  await act(async () => nextYear.click())
  assert.equal(
    [...document.querySelectorAll('.rdp-month_caption')].every((caption) =>
      caption.textContent?.includes('2027')
    ),
    true
  )

  await cleanupPicker(root, container)
})
