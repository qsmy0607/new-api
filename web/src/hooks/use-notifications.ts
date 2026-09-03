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
import { useEffect, useMemo, useState } from 'react'

import {
  getAnnouncementsSignature,
  getUnreadAnnouncementCount,
  type NotificationAnnouncement,
} from '@/hooks/notification-unread'
import { useStatus } from '@/hooks/use-status'
import { useNotificationStore } from '@/stores/notification-store'

/**
 * Hook to manage system announcements and their read state
 */
export function useNotifications() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const {
    status,
    loading: statusLoading,
    isPlaceholderData,
  } = useStatus({ refetchInterval: 5 * 60 * 1000 })
  const announcementsEnabled = status?.announcements_enabled ?? false
  const announcements = useMemo<NotificationAnnouncement[]>(() => {
    if (!announcementsEnabled) return []
    return (status?.announcements || []) as NotificationAnnouncement[]
  }, [announcementsEnabled, status?.announcements])

  const readAnnouncementKeys = useNotificationStore(
    (state) => state.readAnnouncementKeys
  )
  const lastAutoOpenedAnnouncementSignature = useNotificationStore(
    (state) => state.lastAutoOpenedAnnouncementSignature
  )
  const setLastAutoOpenedAnnouncementSignature = useNotificationStore(
    (state) => state.setLastAutoOpenedAnnouncementSignature
  )
  const announcementSignature = getAnnouncementsSignature(announcements)
  const unreadCount = getUnreadAnnouncementCount(
    announcements,
    readAnnouncementKeys
  )
  const announcementsLoading = statusLoading || isPlaceholderData

  useEffect(() => {
    if (announcementsLoading) return

    if (!announcementSignature) {
      if (lastAutoOpenedAnnouncementSignature) {
        setLastAutoOpenedAnnouncementSignature('')
      }
      return
    }

    if (announcementSignature === lastAutoOpenedAnnouncementSignature) return

    setLastAutoOpenedAnnouncementSignature(announcementSignature)
    setDialogOpen(true)
  }, [
    announcementSignature,
    announcementsLoading,
    lastAutoOpenedAnnouncementSignature,
    setLastAutoOpenedAnnouncementSignature,
  ])

  return {
    announcements,
    loading: announcementsLoading,
    unreadCount,
    popoverOpen: dialogOpen,
    setPopoverOpen: setDialogOpen,
  }
}
