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

import { aboutFullWidthLayoutClasses } from '../layout'

describe('about page layout', () => {
  test('places full-width content below the fixed public header', () => {
    const mainClasses = aboutFullWidthLayoutClasses.main.split(' ')

    assert.ok(mainClasses.includes('pt-20'))
  })

  test('sizes embedded pages within the viewport below the header offset', () => {
    const iframeClasses = aboutFullWidthLayoutClasses.iframe.split(' ')

    assert.ok(iframeClasses.includes('h-[calc(100svh-5rem)]'))
  })
})
