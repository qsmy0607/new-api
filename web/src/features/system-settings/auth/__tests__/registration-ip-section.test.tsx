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
import { beforeAll, describe, expect, test } from 'vitest'

import { RegistrationIPSection } from '../registration-ip-section'

describe('registration IP blacklist settings', () => {
  beforeAll(() => {
    i18next.addResourceBundle('en', 'translation', {
      'Blocked IP addresses and networks': 'Blocked IP addresses and networks',
      'Enable registration IP blacklist': 'Enable registration IP blacklist',
    })
  })

  test('keeps the blacklist editable while protection is disabled', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <RegistrationIPSection
          defaultValues={{
            RegistrationIPBlacklist: '203.0.113.10',
            RegistrationIPBlacklistEnabled: false,
          }}
        />
      </QueryClientProvider>
    )

    const enabledSwitch = screen.getByRole('switch', {
      name: 'Enable registration IP blacklist',
    })
    const blacklist = screen.getByRole('textbox', {
      name: 'Blocked IP addresses and networks',
    })

    expect(enabledSwitch).not.toBeChecked()
    expect(blacklist).toHaveValue('203.0.113.10')
    expect(blacklist).toBeEnabled()

    await user.click(enabledSwitch)
    expect(enabledSwitch).toBeChecked()

    queryClient.clear()
  })
})
