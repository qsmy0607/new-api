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

import {
  DEFAULT_REDEMPTION_COPY_TEMPLATE,
  formatRedemptionCopyText,
  formatRedemptionsCopyText,
} from '../copy-template'

describe('redemption copy template', () => {
  test('replaces every code placeholder for a single redemption', () => {
    assert.equal(
      formatRedemptionCopyText('code={{code}}; again={{code}}', 'abc123'),
      'code=abc123; again=abc123'
    )
  })

  test('appends the code when the template has no placeholder', () => {
    assert.equal(
      formatRedemptionCopyText('Your code: ', 'abc123'),
      'Your code: abc123'
    )
  })

  test('uses the default template when the saved template is empty', () => {
    assert.equal(
      formatRedemptionCopyText('', 'abc123'),
      DEFAULT_REDEMPTION_COPY_TEMPLATE.replaceAll('{{code}}', 'abc123')
    )
  })

  test('separates multiple formatted redemptions with a blank line', () => {
    assert.equal(
      formatRedemptionsCopyText('Code: {{code}}', ['first', 'second']),
      'Code: first\n\nCode: second'
    )
  })
})
