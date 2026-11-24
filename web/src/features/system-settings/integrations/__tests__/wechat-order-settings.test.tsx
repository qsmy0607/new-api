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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { SettingsPageProvider } from '../../components/settings-page-context'
import { WeChatOrderSettingsSection } from '../wechat-order-settings-section'

const endpoint = '/api/option/wechat-order'
const saved = {
  enabled: true,
  app_id: 'test-app',
  secret_configured: true,
  template_id: 'template',
  recipients: 'receiver',
}

function Fixture() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  return (
    <>
      <div ref={setContainer} />
      <SettingsPageProvider actionsContainer={container}>
        <WeChatOrderSettingsSection />
      </SettingsPageProvider>
    </>
  )
}

function renderSettings() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <Fixture />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: { config: saved, recent: [] } },
  })
  vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true } })
  vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true } })
})
afterEach(() => vi.restoreAllMocks())

test('saving a changed template keeps the saved secret and clears the replacement secret from the form', async () => {
  const user = userEvent.setup()
  renderSettings()
  const template = await screen.findByRole('textbox', {
    name: 'WeChat template ID',
  })
  expect(screen.getByLabelText('AppSecret')).toHaveValue('')
  expect(
    screen.getByText('Leave blank to keep the saved secret.')
  ).toBeVisible()
  await user.clear(template)
  await user.type(template, 'new-template')
  expect(
    screen.getByRole('button', { name: 'Send test notification' })
  ).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Save Changes' }))
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({ app_secret: '', template_id: 'new-template' })
    )
  )
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Send test notification' })
    ).toBeEnabled()
  )
  expect(screen.getByLabelText('AppSecret')).toHaveValue('')
})

test('a rejected save preserves the unsaved secret and keeps testing disabled', async () => {
  vi.mocked(api.put).mockResolvedValue({
    data: { success: false, message: 'Save rejected' },
  })
  const user = userEvent.setup()
  renderSettings()
  await screen.findByRole('textbox', { name: 'WeChat template ID' })
  await user.type(screen.getByLabelText('AppSecret'), 'replacement-secret')
  await user.click(screen.getByRole('button', { name: 'Save Changes' }))
  await waitFor(() => expect(api.put).toHaveBeenCalled())
  expect(screen.getByLabelText('AppSecret')).toHaveValue('replacement-secret')
  expect(
    screen.getByRole('button', { name: 'Send test notification' })
  ).toBeDisabled()
  expect(api.post).not.toHaveBeenCalled()
})

test('saved settings can send a test notification without a payment', async () => {
  const user = userEvent.setup()
  renderSettings()
  await user.click(
    await screen.findByRole('button', { name: 'Send test notification' })
  )
  await waitFor(() => expect(api.post).toHaveBeenCalledWith(`${endpoint}/test`))
})

test('failed notifications expose retry while accepted notifications do not', async () => {
  vi.mocked(api.get).mockResolvedValue({
    data: {
      success: true,
      data: {
        config: saved,
        recent: [
          {
            id: 1,
            order_type: 'topup',
            trade_no: 'paid-order',
            amount: '10.00',
            recipient: 'receiver',
            status: 'failed',
            attempts: 8,
            last_error: 'WeChat API error -1',
          },
          {
            id: 2,
            order_type: 'subscription',
            trade_no: 'subscription-order',
            amount: '5.00',
            recipient: 'receiver',
            status: 'sent',
            attempts: 1,
            last_error: '',
          },
        ],
      },
    },
  })
  const user = userEvent.setup()
  renderSettings()
  const retry = await screen.findByRole('button', { name: 'Retry' })
  expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(1)
  expect(screen.getByText('Accepted by WeChat')).toBeVisible()
  await user.click(retry)
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(`${endpoint}/retry`, { id: 1 })
  )
})
