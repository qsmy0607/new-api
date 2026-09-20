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
import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'

import type { IPAction } from '../types'

type IPActionDialogProps = {
  action: IPAction | null
  isLoading: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function IPActionDialog(props: IPActionDialogProps) {
  const { t } = useTranslation()
  if (!props.action) return null

  if (props.action.kind === 'block') {
    return (
      <ConfirmDialog
        open
        onOpenChange={props.onOpenChange}
        title={t('Block Registration IPs')}
        desc={t(
          '{{count}} IP addresses will be added to the registration blacklist.',
          { count: props.action.ips.length }
        )}
        confirmText={t('Block IP')}
        destructive
        isLoading={props.isLoading}
        handleConfirm={props.onConfirm}
      >
        <div className='flex max-h-44 flex-wrap gap-2 overflow-y-auto'>
          {props.action.ips.map((ip) => (
            <Badge key={ip} variant='outline' className='font-mono'>
              {ip}
            </Badge>
          ))}
        </div>
      </ConfirmDialog>
    )
  }

  return (
    <ConfirmDialog
      open
      onOpenChange={props.onOpenChange}
      title={t('Disable Users')}
      desc={t('{{count}} enabled users will be disabled.', {
        count: props.action.users.length,
      })}
      confirmText={t('Disable Users')}
      destructive
      isLoading={props.isLoading}
      handleConfirm={props.onConfirm}
    >
      <div className='max-h-56 overflow-y-auto rounded-md border'>
        {props.action.users.map((user) => (
          <div
            key={user.id}
            className='flex items-center justify-between gap-4 border-b px-3 py-2 text-sm last:border-b-0'
          >
            <span className='min-w-0 truncate font-medium'>
              {user.username}
            </span>
            <span className='text-muted-foreground shrink-0 font-mono text-xs'>
              {user.registration_ip || user.last_login_ip || '-'}
            </span>
          </div>
        ))}
      </div>
    </ConfirmDialog>
  )
}
