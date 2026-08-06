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
import { useStatus } from '@/hooks/use-status'
import { getNotice } from '@/lib/api'
import { useNotificationStore } from '@/stores/notification-store'

let autoOpenedNoticeContent = ''

function hashString(input: string): string {
  let hash = 0
  if (!input) return '0'

  for (let i = 0; i < input.length; i += 1) {
    const chr = input.charCodeAt(i)
    hash = (hash << 5) - hash + chr
    hash |= 0
  }

  return hash.toString(36)
}

/**
 * Generate a unique key for an announcement
 * Prefer backend id, fall back to a content hash so edits register
 */
function getAnnouncementKey(item: Record<string, unknown>): string {
  if (!item) return ''

  if (item.id !== undefined && item.id !== null) {
    return `id:${item.id}`
  }

  const fingerprint = JSON.stringify({
    publishDate: (item?.publishDate as string) || '',
    content: ((item?.content as string) || '').trim(),
    extra: ((item?.extra as string) || '').trim(),
    type: (item?.type as string) || '',
    title: ((item?.title as string) || '').trim(),
    link: ((item?.link as string) || '').trim(),
  })
  return `hash:${hashString(fingerprint)}`
}

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
  const announcements = useMemo<Record<string, unknown>[]>(() => {
    if (!announcementsEnabled) return []
    return ((status?.announcements || []) as Record<string, unknown>[]).slice(
      0,
      20
    )
  }, [announcementsEnabled, status?.announcements])

  // Notification store
  const {
    lastReadNotice,
    markNoticeRead,
    markAnnouncementsRead,
    isAnnouncementRead,
    closedUntilDate,
  } = useNotificationStore()

  // Extract notice content
  const noticeContent = noticeResponse?.success
    ? (noticeResponse.data || '').trim()
    : ''

  // Calculate unread counts
  const unreadCounts = useMemo(() => {
    const noticeUnread =
      noticeContent && noticeContent !== lastReadNotice ? 1 : 0

    const announcementsUnread = announcements.filter(
      (item: Record<string, unknown>) => {
        const key = getAnnouncementKey(item)
        return !isAnnouncementRead(key)
      }
    ).length

    return {
      notice: noticeUnread,
      announcements: announcementsUnread,
      total: noticeUnread + announcementsUnread,
    }
  }, [noticeContent, lastReadNotice, announcements, isAnnouncementRead])

  const markAnnouncementsAsRead = useCallback(() => {
    if (announcements.length > 0) {
      const allKeys = announcements.map((item: Record<string, unknown>) =>
        getAnnouncementKey(item)
      )
      markAnnouncementsRead(allKeys)
    }
  }, [announcements, markAnnouncementsRead])

  const markTabAsRead = useCallback(
    (tab: 'notice' | 'announcements') => {
      if (tab === 'notice' && noticeContent) {
        markNoticeRead(noticeContent)
      } else if (tab === 'announcements') {
        markAnnouncementsAsRead()
      }
    },
    [markAnnouncementsAsRead, markNoticeRead, noticeContent]
  )

  const handleOpenDialog = useCallback(
    (tab?: 'notice' | 'announcements') => {
      const nextTab = tab || activeTab

      if (nextTab === 'notice' && noticeContent) {
        autoOpenedNoticeContent = noticeContent
      }
      markTabAsRead(nextTab)

      setActiveTab(nextTab)
      setDialogOpen(true)
    },
    [activeTab, markTabAsRead, noticeContent]
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

  // Handle tab change - mark announcements as read when switching to that tab
  const handleTabChange = (tab: 'notice' | 'announcements') => {
    setActiveTab(tab)
    markTabAsRead(tab)
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
