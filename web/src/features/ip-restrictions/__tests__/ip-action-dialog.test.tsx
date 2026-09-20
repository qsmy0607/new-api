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
import i18next from 'i18next'
import { beforeAll, expect, test, vi } from 'vitest'

import { IPActionDialog } from '../components/ip-action-dialog'
import type { UserIPRisk } from '../types'

beforeAll(() => {
  i18next.addResourceBundle('en', 'translation', {
    'Disable Users': 'Disable Users',
    '{{count}} enabled users will be disabled.':
      '{{count}} enabled users will be disabled.',
  })
})

test('previews affected users before invoking the existing disable action', async () => {
  const handleConfirm = vi.fn()
  const affectedUser: UserIPRisk = {
    id: 7,
    username: 'shared-ip-user',
    display_name: 'Shared IP User',
    email: 'user@example.com',
    registration_ip: '203.0.113.10',
    last_login_ip: '203.0.113.10',
    registration_ip_count: 2,
    last_login_ip_count: 2,
    registration_ip_blocked: false,
    last_login_ip_blocked: false,
    status: 1,
    role: 1,
    quota: 0,
    created_at: 1,
    last_login_at: 1,
  }

  render(
    <IPActionDialog
      action={{ kind: 'disable', users: [affectedUser] }}
      isLoading={false}
      onOpenChange={vi.fn()}
      onConfirm={handleConfirm}
    />
  )

  expect(screen.getByText('shared-ip-user')).toBeVisible()
  expect(screen.getByText('203.0.113.10')).toBeVisible()

  await userEvent.click(
    screen.getByRole('button', { name: 'Disable Users' })
  )
  expect(handleConfirm).toHaveBeenCalledOnce()
})
