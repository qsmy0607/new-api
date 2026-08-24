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

export interface NotificationAnnouncement {
  id?: number | string
  type?: string
  content?: string
  extra?: string
  publishDate?: string | Date
  title?: string
  link?: string
}

export function getAnnouncementKey(item: NotificationAnnouncement): string {
  if (!item) return ''

  if (item.id !== undefined && item.id !== null) {
    return `id:${item.id}`
  }

  const fingerprint = JSON.stringify({
    publishDate: (item.publishDate as string) || '',
    content: ((item.content as string) || '').trim(),
    extra: ((item.extra as string) || '').trim(),
    type: (item.type as string) || '',
    title: ((item.title as string) || '').trim(),
    link: ((item.link as string) || '').trim(),
  })
  return `hash:${hashString(fingerprint)}`
}

interface GetUnreadNotificationCountsOptions {
  noticeContent: string
  lastReadNotice: string
  announcements: NotificationAnnouncement[]
  readAnnouncementKeys: string[]
}

interface NotificationUnreadCounts {
  notice: number
  announcements: number
  total: number
}

export function getUnreadNotificationCounts(
  options: GetUnreadNotificationCountsOptions
): NotificationUnreadCounts {
  const noticeUnread =
    options.noticeContent && options.noticeContent !== options.lastReadNotice
      ? 1
      : 0
  const readAnnouncementKeys = new Set(options.readAnnouncementKeys)
  const announcementsUnread = options.announcements.filter(
    (item) => !readAnnouncementKeys.has(getAnnouncementKey(item))
  ).length

  return {
    notice: noticeUnread,
    announcements: announcementsUnread,
    total: noticeUnread + announcementsUnread,
  }
}
