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
import { expect, test } from 'vitest'

import {
  getContactQRCodeUploadError,
  isContactQRCodeValue,
  maxContactQRCodeSize,
} from '../contact-qr-code'

test('accepts supported contact QR code images within the size limit', () => {
  expect(
    getContactQRCodeUploadError({
      type: 'image/png',
      size: maxContactQRCodeSize,
    })
  ).toBeUndefined()
})

test('rejects unsupported or oversized contact QR code images', () => {
  expect(
    getContactQRCodeUploadError({ type: 'image/svg+xml', size: 128 })
  ).toBe('invalid_type')
  expect(
    getContactQRCodeUploadError({
      type: 'image/webp',
      size: maxContactQRCodeSize + 1,
    })
  ).toBe('too_large')
})

test('accepts uploaded QR code paths and HTTPS URLs only', () => {
  expect(
    isContactQRCodeValue(
      '/api/contact/qr-code/15b2e26fd23642f08725765dfe16f042'
    )
  ).toBe(true)
  expect(isContactQRCodeValue('https://example.com/contact-qr.png')).toBe(true)
  expect(isContactQRCodeValue('data:image/png;base64,AAAA')).toBe(false)
})
