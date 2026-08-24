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
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { shouldAutoOpenNotice } from '@/hooks/notification-auto-open'
import {
  getUnreadNotificationCounts,
  type NotificationAnnouncement,
} from '@/hooks/notification-unread'
import { useStatus } from '@/hooks/use-status'
import { getNotice } from '@/lib/api'
import { useNotificationStore } from '@/stores/notification-store'

let autoOpenedNoticeContent = ''

/**
 * Hook to manage notifications (Notice + Announcements)
 * Provides unread counts and read status management
 */
export function useNotifications() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'notice' | 'announcements'>(
    'notice'
  )

  // Fetch Notice from API
  const {
    data: noticeResponse,
    isLoading: noticeLoading,
    refetch: refetchNotice,
  } = useQuery({
    queryKey: ['notice'],
    queryFn: getNotice,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Fetch Announcements from status
  const { status, loading: statusLoading } = useStatus()
  const announcementsEnabled = status?.announcements_enabled ?? false
  const announcements = useMemo<NotificationAnnouncement[]>(() => {
    if (!announcementsEnabled) return []
    return ((status?.announcements || []) as NotificationAnnouncement[]).slice(
      0,
      20
    )
  }, [announcementsEnabled, status?.announcements])

  // Notification store
  const {
    lastReadNotice,
    readAnnouncementKeys,
    markNoticeRead,
    closedUntilDate,
  } = useNotificationStore()

  // Extract notice content
  const noticeContent = noticeResponse?.success
    ? (noticeResponse.data || '').trim()
    : ''

  // Calculate unread counts
  const unreadCounts = getUnreadNotificationCounts({
    noticeContent,
    lastReadNotice,
    announcements,
    readAnnouncementKeys,
  })

  const markNoticeAsRead = useCallback(() => {
    if (noticeContent) {
      markNoticeRead(noticeContent)
    }
  }, [markNoticeRead, noticeContent])

  const handleOpenDialog = useCallback(
    (tab?: 'notice' | 'announcements') => {
      const nextTab = tab || activeTab

      if (nextTab === 'notice' && noticeContent) {
        autoOpenedNoticeContent = noticeContent
        markNoticeAsRead()
      }

      setActiveTab(nextTab)
      setDialogOpen(true)
    },
    [activeTab, markNoticeAsRead, noticeContent]
  )

  const loading = noticeLoading || statusLoading

  useEffect(() => {
    if (
      !shouldAutoOpenNotice({
        noticeContent,
        loading,
        closedUntilDate,
        autoOpenedNoticeContent,
        today: new Date().toDateString(),
      })
    ) {
      return
    }

    handleOpenDialog('notice')
  }, [closedUntilDate, handleOpenDialog, loading, noticeContent])

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      handleOpenDialog(activeTab)
      return
    }

    setDialogOpen(false)
  }

  const handleTabChange = (tab: 'notice' | 'announcements') => {
    setActiveTab(tab)
    if (tab === 'notice') {
      markNoticeAsRead()
    }
  }

  return {
    // Data
    notice: noticeContent,
    announcements,
    loading,

    // Unread counts
    unreadCount: unreadCounts.total,
    unreadNoticeCount: unreadCounts.notice,
    unreadAnnouncementsCount: unreadCounts.announcements,

    // Popover state (the notification center now renders as a dialog)
    popoverOpen: dialogOpen,
    setPopoverOpen: handleDialogOpenChange,
    activeTab,
    setActiveTab: handleTabChange,

    // Actions
    openPopover: handleOpenDialog,
    closePopover: () => setDialogOpen(false),
    refetchNotice,
  }
}
