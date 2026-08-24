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

import { getUnreadNotificationCounts } from '../notification-unread'

const announcements = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]

describe('notification unread counts', () => {
  test('decrements the count only for announcements that were individually read', () => {
    const unreadCounts = getUnreadNotificationCounts({
      noticeContent: '',
      lastReadNotice: '',
      announcements,
      readAnnouncementKeys: ['id:1'],
    })

    assert.deepEqual(unreadCounts, {
      notice: 0,
      announcements: 3,
      total: 3,
    })
  })

  test('keeps an unread notice in the total after announcements are read', () => {
    const unreadCounts = getUnreadNotificationCounts({
      noticeContent: 'Scheduled maintenance',
      lastReadNotice: '',
      announcements,
      readAnnouncementKeys: ['id:1', 'id:2', 'id:3', 'id:4'],
    })

    assert.deepEqual(unreadCounts, {
      notice: 1,
      announcements: 0,
      total: 1,
    })
  })
})
