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
import { describe, expect, test } from 'vitest'

import en from '../locales/en.json'
import fr from '../locales/fr.json'
import ja from '../locales/ja.json'
import ru from '../locales/ru.json'
import vi from '../locales/vi.json'
import zhTW from '../locales/zh-TW.json'
import zh from '../locales/zh.json'

const locales = { en, fr, ja, ru, vi, zh, 'zh-TW': zhTW }

describe('locale text encoding', () => {
  test.each(Object.entries(locales))(
    '%s contains no replacement characters or question mark runs',
    (_, locale) => {
      const corrupted = Object.entries(locale.translation).filter(([, value]) =>
        /\?{3,}|\uFFFD/.test(value)
      )
      expect(corrupted).toEqual([])
    }
  )

  test('Chinese order notification and bulk deletion labels retain their characters', () => {
    expect(zh.translation['WeChat Order Notifications']).toBe('微信订单通知')
    expect(zhTW.translation['WeChat Order Notifications']).toBe('微信訂單通知')
    expect(zh.translation['Delete selected users']).toBe('删除选中用户')
    expect(zhTW.translation['Delete selected users']).toBe('刪除選取的使用者')
  })
})
