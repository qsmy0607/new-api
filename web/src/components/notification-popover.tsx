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
import { Megaphone02Icon, Notification02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import { notificationContentAreaClassName } from '@/components/notification-popover-layout'
import { RichContent } from '@/components/rich-content'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  getAnnouncementKey,
  type NotificationAnnouncement,
} from '@/hooks/notification-unread'
import { getAnnouncementColorClass } from '@/lib/colors'
import { formatDateTimeObject } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useNotificationStore } from '@/stores/notification-store'

interface NotificationPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unreadCount: number
  announcements: NotificationAnnouncement[]
  loading: boolean
  className?: string
}

/**
 * Get relative time string from a date
 */
function getRelativeTime(publishDate: string | Date, t: TFunction): string {
  if (!publishDate) return ''

  const now = new Date()
  const pubDate = new Date(publishDate)

  // If invalid date, return original string
  if (Number.isNaN(pubDate.getTime())) {
    return typeof publishDate === 'string' ? publishDate : ''
  }

  const diffMs = now.getTime() - pubDate.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  // If future time, show specific date
  if (diffMs < 0) return formatDateTimeObject(pubDate)

  // Return relative time based on difference
  if (diffSeconds < 60) return t('Just now')
  if (diffMinutes < 60) {
    return diffMinutes === 1
      ? t('1 minute ago')
      : t('{{count}} minutes ago', { count: diffMinutes })
  }
  if (diffHours < 24) {
    return diffHours === 1
      ? t('1 hour ago')
      : t('{{count}} hours ago', { count: diffHours })
  }
  if (diffDays < 7) {
    return diffDays === 1
      ? t('1 day ago')
      : t('{{count}} days ago', { count: diffDays })
  }
  if (diffWeeks < 4) {
    return diffWeeks === 1
      ? t('1 week ago')
      : t('{{count}} weeks ago', { count: diffWeeks })
  }
  if (diffMonths < 12) {
    return diffMonths === 1
      ? t('1 month ago')
      : t('{{count}} months ago', { count: diffMonths })
  }
  if (diffYears < 2) return t('1 year ago')

  // Over 2 years, show specific date
  return formatDateTimeObject(pubDate)
}

/**
 * Announcement status dot indicator
 */
function AnnouncementDot({ type }: { type?: string }) {
  return (
    <span
      className={cn(
        'mt-1.5 inline-block size-2 shrink-0 rounded-full',
        getAnnouncementColorClass(type)
      )}
    />
  )
}

/**
 * Empty state component
 */
function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <Empty className='min-h-48 border-0 p-4'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
    </Empty>
  )
}

/**
 * Announcements content
 */
function AnnouncementsContent({
  announcements,
  readAnnouncementKeys,
  onAnnouncementRead,
  loading,
  t,
}: {
  announcements: NotificationAnnouncement[]
  readAnnouncementKeys: string[]
  onAnnouncementRead: (key: string) => void
  loading: boolean
  t: TFunction
}) {
  if (loading) {
    return (
      <EmptyState
        icon={<HugeiconsIcon icon={Megaphone02Icon} strokeWidth={2} />}
        title={t('Loading...')}
        description={t('Latest platform updates and notices')}
      />
    )
  }

  if (announcements.length === 0) {
    return (
      <EmptyState
        icon={<HugeiconsIcon icon={Megaphone02Icon} strokeWidth={2} />}
        title={t('No system announcements')}
      />
    )
  }

  return (
    <ScrollArea className={notificationContentAreaClassName}>
      <div className='flex flex-col'>
        {announcements.map((item, idx) => {
          const announcementKey = getAnnouncementKey(item)
          const isRead = readAnnouncementKeys.includes(announcementKey)
          const publishDate = item.publishDate
            ? new Date(item.publishDate)
            : null
          const relativeTime = publishDate
            ? getRelativeTime(publishDate, t)
            : ''
          const absoluteTime = publishDate
            ? formatDateTimeObject(publishDate)
            : ''

          return (
            <div key={announcementKey}>
              <div
                className={cn(
                  '-mx-2 rounded-md px-2 py-3 transition-colors',
                  !isRead &&
                    'bg-muted/40 hover:bg-muted/60 focus-visible:ring-ring/50 cursor-pointer outline-none focus-visible:ring-[3px]'
                )}
                role={isRead ? undefined : 'button'}
                tabIndex={isRead ? undefined : 0}
                aria-label={isRead ? undefined : t('Mark announcement as read')}
                onClick={() => {
                  if (!isRead) {
                    onAnnouncementRead(announcementKey)
                  }
                }}
                onKeyDown={(event) => {
                  if (
                    isRead ||
                    event.target !== event.currentTarget ||
                    (event.key !== 'Enter' && event.key !== ' ')
                  ) {
                    return
                  }

                  event.preventDefault()
                  onAnnouncementRead(announcementKey)
                }}
              >
                <div className='flex items-start gap-3'>
                  <AnnouncementDot type={item.type} />
                  <div className='flex min-w-0 flex-1 flex-col gap-2'>
                    <div className='text-sm'>
                      <RichContent breaks content={item.content || ''} />
                    </div>

                    {item.extra ? (
                      <div className='text-muted-foreground text-xs'>
                        <RichContent breaks content={item.extra} />
                      </div>
                    ) : null}

                    {absoluteTime ? (
                      <div className='text-muted-foreground text-xs'>
                        {relativeTime ? `${relativeTime} • ` : null}
                        {absoluteTime}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              {idx < announcements.length - 1 ? <Separator /> : null}
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

/**
 * Announcement dialog
 */
export function NotificationPopover({
  open,
  onOpenChange,
  unreadCount,
  announcements,
  loading,
  className,
}: NotificationPopoverProps) {
  const { t } = useTranslation()
  const readAnnouncementKeys = useNotificationStore(
    (state) => state.readAnnouncementKeys
  )
  const markAnnouncementsRead = useNotificationStore(
    (state) => state.markAnnouncementsRead
  )

  const handleAnnouncementRead = (key: string) => {
    markAnnouncementsRead([key])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant='ghost'
            size='icon'
            className={cn('relative size-9', className)}
            aria-label={t('Announcements')}
          />
        }
      >
        <HugeiconsIcon
          icon={Notification02Icon}
          strokeWidth={2}
          aria-hidden='true'
        />
        {unreadCount > 0 ? (
          <Badge
            variant='destructive'
            className='absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center px-1 text-[10px] font-semibold tabular-nums'
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        ) : null}
      </DialogTrigger>

      <DialogContent className='max-h-[calc(100dvh-1rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl lg:max-w-4xl'>
        <DialogHeader className='shrink-0 border-b px-4 py-4 pr-12 sm:px-6 sm:pr-14'>
          <DialogTitle className='text-base font-semibold'>
            {t('System Announcements')}
          </DialogTitle>
          <DialogDescription className='sr-only'>
            {t('Latest platform updates and notices')}
          </DialogDescription>
        </DialogHeader>

        <div className='min-h-0 px-4 py-3 sm:px-6 sm:py-4'>
          <AnnouncementsContent
            announcements={announcements}
            readAnnouncementKeys={readAnnouncementKeys}
            onAnnouncementRead={handleAnnouncementRead}
            loading={loading}
            t={t}
          />
        </div>

        <DialogFooter className='mx-0 mb-0 shrink-0 rounded-none rounded-b-xl px-4 py-3 sm:px-6'>
          <DialogClose render={<Button />}>{t('Close')}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
