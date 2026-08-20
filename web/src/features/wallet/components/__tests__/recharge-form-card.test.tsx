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

import { describe, test } from 'vitest'

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { RechargeFormCard } = await import('../recharge-form-card')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {},
    },
  },
})

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

describe('recharge form card', () => {
  test('shows preset amounts with a dollar symbol suffix', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <RechargeFormCard
            topupInfo={{
              enable_online_topup: true,
              enable_stripe_topup: false,
              pay_methods: [],
              min_topup: 1,
              stripe_min_topup: 1,
              amount_options: [100],
              discount: {},
            }}
            presetAmounts={[{ value: 100 }]}
            selectedPreset={null}
            onSelectPreset={() => undefined}
            topupAmount={100}
            onTopupAmountChange={() => undefined}
            paymentAmount={100}
            calculating={false}
            onPaymentMethodSelect={() => undefined}
            paymentLoading={null}
            redemptionCode=''
            onRedemptionCodeChange={() => undefined}
            onRedeem={() => undefined}
            redeeming={false}
          />
        </I18nextProvider>
      )
    })

    const presetAmount = container.querySelector(
      '[data-preset-amount-value="true"]'
    )
    assert.ok(presetAmount)
    assert.equal(presetAmount.textContent?.trim(), '100 $')

    await act(async () => root.unmount())
    container.remove()
  })

  test('shows only the payment amount beneath a discounted preset', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <RechargeFormCard
            topupInfo={{
              enable_online_topup: true,
              enable_stripe_topup: false,
              pay_methods: [],
              min_topup: 1,
              stripe_min_topup: 1,
              amount_options: [1000],
              discount: { 1000: 0.5 },
            }}
            presetAmounts={[{ value: 1000, discount: 0.5 }]}
            selectedPreset={null}
            onSelectPreset={() => undefined}
            topupAmount={1000}
            onTopupAmountChange={() => undefined}
            paymentAmount={500}
            calculating={false}
            onPaymentMethodSelect={() => undefined}
            paymentLoading={null}
            redemptionCode=''
            onRedemptionCodeChange={() => undefined}
            onRedeem={() => undefined}
            redeeming={false}
          />
        </I18nextProvider>
      )
    })

    const discountLabel = container.querySelector(
      '[data-preset-discount="true"]'
    )
    assert.ok(discountLabel)
    assert.equal(discountLabel.classList.contains('text-[10px]'), true)
    assert.equal(discountLabel.classList.contains('leading-3'), true)
    assert.equal(discountLabel.classList.contains('whitespace-nowrap'), true)
    assert.equal(discountLabel.classList.contains('shrink-0'), true)

    const paymentAmount = container.querySelector(
      '[data-preset-payment-amount="true"]'
    )
    assert.ok(paymentAmount)
    assert.equal(paymentAmount.textContent?.trim(), 'Pay ¥500')
    assert.equal(paymentAmount.textContent?.includes('Pay'), true)
    assert.equal(container.querySelector('[data-preset-savings="true"]'), null)

    await act(async () => root.unmount())
    container.remove()
  })
})
