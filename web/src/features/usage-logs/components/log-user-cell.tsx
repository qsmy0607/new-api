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
import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getUserAvatarFallback, getUserAvatarStyle } from '@/lib/avatar'
import { cn } from '@/lib/utils'

import { useUsageLogsContext } from './usage-logs-provider'

interface LogUserCellProps {
  userId: number
  displayName: string
  copyValue?: string
  className?: string
  nameClassName?: string
}

export function LogUserCell(props: LogUserCellProps) {
  const { t } = useTranslation()
  const { copyToClipboard } = useCopyToClipboard()
  const { sensitiveVisible, setSelectedUserId, setUserInfoDialogOpen } =
    useUsageLogsContext()
  const canCopy = sensitiveVisible && Boolean(props.copyValue)

  const handleCopy = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!canCopy || !props.copyValue) return
    void copyToClipboard(props.copyValue)
  }

  const handleOpenDetails = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setSelectedUserId(props.userId)
    setUserInfoDialogOpen(true)
  }

  const avatarButton = (
    <button
      type='button'
      className='focus-visible:ring-ring cursor-copy rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-default'
      disabled={!canCopy}
      aria-label={
        canCopy
          ? `${t('Click to copy')}: ${props.copyValue}`
          : t('Click to copy')
      }
      onClick={handleCopy}
    >
      <Avatar className='ring-border/60 size-6 shrink-0 ring-1'>
        <AvatarFallback
          className={cn(
            'text-[11px] font-semibold',
            !sensitiveVisible && 'bg-muted text-muted-foreground'
          )}
          style={
            sensitiveVisible ? getUserAvatarStyle(props.displayName) : undefined
          }
        >
          {sensitiveVisible
            ? getUserAvatarFallback(props.displayName)
            : '\u2022'}
        </AvatarFallback>
      </Avatar>
    </button>
  )

  const nameButton = (
    <button
      type='button'
      className={cn(
        'text-muted-foreground min-w-0 truncate rounded-sm text-left text-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring',
        props.nameClassName
      )}
      aria-label={sensitiveVisible ? props.displayName : t('User')}
      onClick={handleOpenDetails}
    >
      {sensitiveVisible ? props.displayName : '\u2022\u2022\u2022\u2022'}
    </button>
  )

  return (
    <TooltipProvider delay={300}>
      <div
        className={cn(
          'flex min-w-0 items-center gap-1.5 text-left',
          props.className
        )}
      >
        {canCopy ? (
          <Tooltip>
            <TooltipTrigger render={avatarButton} />
            <TooltipContent side='top'>{t('Click to copy')}</TooltipContent>
          </Tooltip>
        ) : (
          avatarButton
        )}
        {sensitiveVisible && props.displayName.length > 12 ? (
          <Tooltip>
            <TooltipTrigger render={nameButton} />
            <TooltipContent side='top'>{props.displayName}</TooltipContent>
          </Tooltip>
        ) : (
          nameButton
        )}
      </div>
    </TooltipProvider>
  )
}
