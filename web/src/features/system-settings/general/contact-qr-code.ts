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
export const maxContactQRCodeSize = 1024 * 1024

const contactQRCodeMimeTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
])

export type ContactQRCodeUploadError = 'invalid_type' | 'too_large'

export function getContactQRCodeUploadError(
  file: Pick<File, 'type' | 'size'>
): ContactQRCodeUploadError | undefined {
  if (!contactQRCodeMimeTypes.has(file.type)) return 'invalid_type'
  if (file.size > maxContactQRCodeSize) return 'too_large'
  return undefined
}

export function isContactQRCodeValue(value: string): boolean {
  if (value === '') return true
  if (/^\/api\/contact\/qr-code\/[a-f0-9]{32}$/i.test(value)) return true

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
