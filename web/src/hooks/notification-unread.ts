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

function getAnnouncementFingerprint(item: NotificationAnnouncement): string {
  return JSON.stringify({
    id: item.id ?? null,
    publishDate: item.publishDate ? String(item.publishDate) : '',
    content: (item.content || '').trim(),
    extra: (item.extra || '').trim(),
    type: item.type || '',
    title: (item.title || '').trim(),
    link: (item.link || '').trim(),
  })
}

export function getAnnouncementKey(item: NotificationAnnouncement): string {
  if (!item) return ''

  const identity =
    item.id !== undefined && item.id !== null ? `id:${item.id}` : 'anonymous'
  return `${identity}:${hashString(getAnnouncementFingerprint(item))}`
}

export function getAnnouncementsSignature(
  announcements: NotificationAnnouncement[]
): string {
  if (announcements.length === 0) return ''
  const fingerprint = JSON.stringify(
    announcements.map(getAnnouncementFingerprint)
  )
  return `announcements:${hashString(fingerprint)}`
}

export function getUnreadAnnouncementCount(
  announcements: NotificationAnnouncement[],
  readKeys: string[]
): number {
  const readAnnouncementKeys = new Set(readKeys)
  return announcements.filter(
    (item) => !readAnnouncementKeys.has(getAnnouncementKey(item))
  ).length
}
