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
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotificationState {
  readAnnouncementKeys: string[]
  lastReadNotice: string
  lastAutoOpenedAnnouncementSignature: string
  markNoticeRead: (notice: string) => void
  markAnnouncementsRead: (keys: string[]) => void
  isAnnouncementRead: (key: string) => boolean
  setLastAutoOpenedAnnouncementSignature: (signature: string) => void
}

/**
 * Notification store for tracking announcement read status
 * Persists to localStorage to maintain state across sessions
 */
export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      readAnnouncementKeys: [] as string[],
      lastReadNotice: '',
      lastAutoOpenedAnnouncementSignature: '',

      markNoticeRead: (notice: string) => set({ lastReadNotice: notice }),

      markAnnouncementsRead: (keys: string[]) => {
        set((state) => ({
          readAnnouncementKeys: [
            ...new Set([...state.readAnnouncementKeys, ...keys]),
          ],
        }))
      },

      isAnnouncementRead: (key: string): boolean =>
        get().readAnnouncementKeys.includes(key),

      setLastAutoOpenedAnnouncementSignature: (signature: string) => {
        set({ lastAutoOpenedAnnouncementSignature: signature })
      },
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        readAnnouncementKeys: state.readAnnouncementKeys,
        lastReadNotice: state.lastReadNotice,
        lastAutoOpenedAnnouncementSignature:
          state.lastAutoOpenedAnnouncementSignature,
      }),
    }
  )
)
