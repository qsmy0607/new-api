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
import { describe, test } from 'node:test'

import { shouldAutoOpenNotice } from '../notification-auto-open'

const today = 'Fri Aug 07 2026'

describe('notification auto-open rules', () => {
  test('opens a notice that has not been shown during this app session', () => {
    assert.equal(
      shouldAutoOpenNotice({
        noticeContent: 'Scheduled maintenance',
        loading: false,
        closedUntilDate: null,
        autoOpenedNoticeContent: '',
        today,
      }),
      true
    )
  })

  test('does not open while loading or when notice content is empty', () => {
    assert.equal(
      shouldAutoOpenNotice({
        noticeContent: 'Scheduled maintenance',
        loading: true,
        closedUntilDate: null,
        autoOpenedNoticeContent: '',
        today,
      }),
      false
    )
    assert.equal(
      shouldAutoOpenNotice({
        noticeContent: '',
        loading: false,
        closedUntilDate: null,
        autoOpenedNoticeContent: '',
        today,
      }),
      false
    )
  })

  test('respects close-today and the current-session display guard', () => {
    assert.equal(
      shouldAutoOpenNotice({
        noticeContent: 'Scheduled maintenance',
        loading: false,
        closedUntilDate: today,
        autoOpenedNoticeContent: '',
        today,
      }),
      false
    )
    assert.equal(
      shouldAutoOpenNotice({
        noticeContent: 'Scheduled maintenance',
        loading: false,
        closedUntilDate: null,
        autoOpenedNoticeContent: 'Scheduled maintenance',
        today,
      }),
      false
    )
  })
})
