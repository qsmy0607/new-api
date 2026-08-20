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

import { beforeEach, describe, test } from 'vitest'

let clipboardShouldFail = false
let fallbackShouldSucceed = false
const copiedValues: string[] = []

Object.defineProperty(navigator, 'clipboard', {
  configurable: true,
  value: {
    writeText: async (value: string) => {
      if (clipboardShouldFail) throw new Error('Clipboard unavailable')
      copiedValues.push(value)
    },
  },
})
Object.defineProperty(document, 'execCommand', {
  configurable: true,
  value: () => fallbackShouldSucceed,
})

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { toast } = await import('sonner')
const { LogUserCell } = await import('../log-user-cell')
const { UsageLogsProvider, useUsageLogsContext } =
  await import('../usage-logs-provider')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'Click to copy': 'Click to copy',
        'Copied to clipboard': 'Copied to clipboard',
        'Failed to copy to clipboard': 'Failed to copy to clipboard',
        User: 'User',
      },
    },
  },
})

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

type RenderedUserCell = {
  container: HTMLDivElement
  root: ReturnType<typeof createRoot>
  parentClicks: number[]
}

function ContextControls() {
  const { selectedUserId, userInfoDialogOpen, setSensitiveVisible } =
    useUsageLogsContext()

  return (
    <>
      <button
        type='button'
        data-hide-sensitive='true'
        aria-label='Hide'
        onClick={() => setSensitiveVisible(false)}
      >
        Hide
      </button>
      <output data-user-details-state='true'>
        {selectedUserId ?? 'none'}:{userInfoDialogOpen ? 'open' : 'closed'}
      </output>
    </>
  )
}

async function renderUserCell(): Promise<RenderedUserCell> {
  const parentClicks: number[] = []
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(
      <I18nextProvider i18n={i18n}>
        <UsageLogsProvider>
          <div onClick={() => parentClicks.push(1)}>
            <LogUserCell userId={42} displayName='alice' copyValue='alice' />
          </div>
          <ContextControls />
        </UsageLogsProvider>
      </I18nextProvider>
    )
  })

  return { container, root, parentClicks }
}

async function unmountUserCell(rendered: RenderedUserCell) {
  await act(async () => rendered.root.unmount())
  rendered.container.remove()
}

function findButton(
  container: HTMLElement,
  accessibleName: string
): HTMLButtonElement {
  const button = [
    ...container.querySelectorAll<HTMLButtonElement>('button'),
  ].find((candidate) => candidate.getAttribute('aria-label') === accessibleName)
  assert.ok(button)
  return button
}

beforeEach(() => {
  clipboardShouldFail = false
  fallbackShouldSucceed = false
  copiedValues.length = 0
})

describe('log user cell', () => {
  test('copies the username from the avatar, shows success, and does not bubble', async () => {
    const historyStart = toast.getHistory().length
    const rendered = await renderUserCell()
    const copyButton = findButton(rendered.container, 'Click to copy: alice')

    copyButton.focus()
    assert.equal(document.activeElement, copyButton)
    assert.equal(copyButton.disabled, false)

    await act(async () => copyButton.click())

    assert.deepEqual(copiedValues, ['alice'])
    assert.deepEqual(rendered.parentClicks, [])
    const newToasts = toast.getHistory().slice(historyStart)
    assert.equal(
      newToasts.some(
        (entry) =>
          'type' in entry &&
          entry.type === 'success' &&
          entry.title === 'Copied to clipboard'
      ),
      true
    )

    await unmountUserCell(rendered)
  })

  test('shows the existing failure notification when username copy fails', async () => {
    clipboardShouldFail = true
    const historyStart = toast.getHistory().length
    const rendered = await renderUserCell()
    const copyButton = findButton(rendered.container, 'Click to copy: alice')

    await act(async () => copyButton.click())

    assert.deepEqual(copiedValues, [])
    assert.deepEqual(rendered.parentClicks, [])
    const newToasts = toast.getHistory().slice(historyStart)
    assert.equal(
      newToasts.some(
        (entry) =>
          'type' in entry &&
          entry.type === 'error' &&
          entry.title === 'Failed to copy to clipboard'
      ),
      true
    )

    await unmountUserCell(rendered)
  })

  test('disables copying while sensitive data is hidden and keeps details available', async () => {
    const rendered = await renderUserCell()
    const hideButton = findButton(rendered.container, 'Hide')

    await act(async () => hideButton.click())

    const copyButton = findButton(rendered.container, 'Click to copy')
    const detailsButton = findButton(rendered.container, 'User')
    assert.equal(copyButton.disabled, true)
    assert.equal(rendered.container.textContent?.includes('alice'), false)

    await act(async () => copyButton.click())
    assert.deepEqual(copiedValues, [])

    await act(async () => detailsButton.click())
    assert.equal(
      rendered.container.querySelector('[data-user-details-state="true"]')
        ?.textContent,
      '42:open'
    )
    assert.deepEqual(rendered.parentClicks, [])

    await unmountUserCell(rendered)
  })
})
