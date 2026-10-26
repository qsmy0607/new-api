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
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { useNotificationStore } from '@/stores/notification-store'

import { useNotifications } from '../use-notifications'

const announcements = Array.from({ length: 24 }, (_, index) => ({
  id: index + 1,
  content: `Announcement ${index + 1}`,
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: vi.fn(() => ({
    status: { announcements_enabled: true, announcements },
    loading: false,
    isPlaceholderData: false,
  })),
}))

describe('useNotifications', () => {
  beforeEach(() => {
    localStorage.clear()
    useNotificationStore.setState({
      readAnnouncementKeys: [],
      lastAutoOpenedAnnouncementSignature: '',
    })
  })

  test('returns every announcement and automatically opens new content', async () => {
    const { result } = renderHook(() => useNotifications())

    expect(result.current.announcements).toHaveLength(24)
    expect(result.current.unreadCount).toBe(24)
    await waitFor(() => expect(result.current.popoverOpen).toBe(true))
  })
})
