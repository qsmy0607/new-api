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
import { describe, expect, test, vi } from 'vitest'

import type { PlanRecord } from '../../types'
import { SubscriptionPurchaseDialog } from '../dialogs/subscription-purchase-dialog'

const plan: PlanRecord = {
  plan: {
    id: 1,
    title: 'Monthly plan',
    price_amount: 10,
    currency: 'USD',
    duration_unit: 'month',
    duration_value: 1,
    quota_reset_period: 'monthly',
    enabled: true,
    sort_order: 0,
    allow_balance_pay: true,
    allow_wallet_overflow: true,
    max_purchase_per_user: 0,
    total_amount: 1000,
    stripe_price_id: 'price_test',
  },
}

describe('subscription purchase payment methods', () => {
  test('keeps online payment available without exposing balance payment', () => {
    render(
      <SubscriptionPurchaseDialog
        open
        onOpenChange={vi.fn()}
        plan={plan}
        enableStripe
      />
    )

    expect(screen.getByRole('button', { name: 'Stripe' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Pay with Balance' })
    ).not.toBeInTheDocument()
  })
})
