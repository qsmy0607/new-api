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
  getAnnouncementKey,
  getAnnouncementsSignature,
  getUnreadAnnouncementCount,
} from '../notification-unread'

const announcements = [
  { id: 1, content: 'First announcement' },
  { id: 2, content: 'Second announcement' },
  { id: 3, content: 'Third announcement' },
  { id: 4, content: 'Fourth announcement' },
]

describe('announcement unread count', () => {
  test('decrements the count only for announcements that were individually read', () => {
    const readKey = getAnnouncementKey(announcements[0])
    assert.equal(getUnreadAnnouncementCount(announcements, [readKey]), 3)
  })

  test('treats edited announcement content as a new version', () => {
    const editedAnnouncements = [
      { ...announcements[0], content: 'Updated first announcement' },
      ...announcements.slice(1),
    ]

    assert.notEqual(
      getAnnouncementKey(announcements[0]),
      getAnnouncementKey(editedAnnouncements[0])
    )
    assert.notEqual(
      getAnnouncementsSignature(announcements),
      getAnnouncementsSignature(editedAnnouncements)
    )
  })
})
