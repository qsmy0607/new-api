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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { beforeAll, describe, expect, test, vi } from 'vitest'

import { QuotaSettingsSection } from '../quota-settings-section'

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useBlocker: () => ({ status: 'idle' }),
}))

describe('new user quota email domain restriction', () => {
  beforeAll(() => {
    i18next.addResourceBundle('en', 'translation', {
      'Exclude Email Domains from New User Quota':
        'Exclude Email Domains from New User Quota',
      'Excluded Email Domains': 'Excluded Email Domains',
    })
  })

  test('keeps the domain list editable while the restriction is disabled', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <QuotaSettingsSection
          defaultValues={{
            QuotaForNewUser: 1000,
            PreConsumedQuota: 0,
            QuotaForInviter: 0,
            QuotaForInvitee: 0,
            TopUpLink: '',
            general_setting: { docs_link: '' },
            quota_setting: {
              enable_free_model_pre_consume: true,
              new_user_quota_domain_restriction_enabled: false,
              new_user_quota_excluded_domains: 'gmail.com\ngooglemail.com',
            },
          }}
        />
      </QueryClientProvider>
    )

    const enabledSwitch = screen.getByRole('switch', {
      name: 'Exclude Email Domains from New User Quota',
    })
    const domainList = screen.getByRole('textbox', {
      name: 'Excluded Email Domains',
    })

    expect(enabledSwitch).not.toBeChecked()
    expect(domainList).toHaveValue('gmail.com\ngooglemail.com')
    expect(domainList).toBeEnabled()

    await user.click(enabledSwitch)
    expect(enabledSwitch).toBeChecked()

    queryClient.clear()
  })
})
