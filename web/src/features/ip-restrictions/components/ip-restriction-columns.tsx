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
import type { ColumnDef } from '@tanstack/react-table'
import { Ban, PowerOff, Users } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { DataTableRowActionMenu } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { StatusBadge } from '@/components/status-badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenuItem,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu'
import {
  USER_ROLE,
  USER_ROLES,
  USER_STATUSES,
} from '@/features/users/constants'
import { formatTimestamp } from '@/lib/format'

import type { IPScope, UserIPRisk } from '../types'
import { IPAddressCell } from './ip-address-cell'

type IPRestrictionColumnsOptions = {
  onBlockIP: (ip: string) => void
  onDisableRelated: (ips: string[], scope: IPScope) => void
  onDisableUsers: (users: UserIPRisk[]) => void
  onFilterIP: (ip: string) => void
}

export function useIPRestrictionColumns(
  options: IPRestrictionColumnsOptions
): ColumnDef<UserIPRisk>[] {
  const { t } = useTranslation()

  return useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label={t('Select all')}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={t('Select row')}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 44,
      },
      {
        accessorKey: 'username',
        header: t('User'),
        cell: ({ row }) => (
          <div className='flex min-w-[150px] flex-col gap-1'>
            <LongText className='max-w-[180px] font-medium'>
              {row.original.username}
            </LongText>
            <span className='text-muted-foreground text-xs'>
              ID {row.original.id}
            </span>
          </div>
        ),
        enableSorting: false,
        size: 190,
        meta: { mobileTitle: true },
      },
      {
        accessorKey: 'email',
        header: t('Email'),
        cell: ({ row }) => (
          <StatusBadge
            label={row.original.email || '-'}
            copyable={Boolean(row.original.email)}
            variant='neutral'
            className='max-w-[220px]'
          />
        ),
        enableSorting: false,
        size: 230,
        meta: { mobileOrder: 20 },
      },
      {
        accessorKey: 'registration_ip',
        header: t('Registration IP'),
        cell: ({ row }) => (
          <IPAddressCell
            ip={row.original.registration_ip}
            count={row.original.registration_ip_count}
            blocked={row.original.registration_ip_blocked}
            onFilter={options.onFilterIP}
          />
        ),
        enableSorting: false,
        size: 260,
        meta: { mobileOrder: 30 },
      },
      {
        accessorKey: 'last_login_ip',
        header: t('Last Login IP'),
        cell: ({ row }) => (
          <IPAddressCell
            ip={row.original.last_login_ip}
            count={row.original.last_login_ip_count}
            blocked={row.original.last_login_ip_blocked}
            onFilter={options.onFilterIP}
          />
        ),
        enableSorting: false,
        size: 260,
        meta: { mobileOrder: 40 },
      },
      {
        accessorKey: 'created_at',
        header: t('Created At'),
        cell: ({ row }) => (
          <span className='text-muted-foreground text-sm whitespace-nowrap'>
            {row.original.created_at
              ? formatTimestamp(row.original.created_at)
              : '-'}
          </span>
        ),
        size: 180,
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'last_login_at',
        header: t('Last Login'),
        cell: ({ row }) => (
          <span className='text-muted-foreground text-sm whitespace-nowrap'>
            {row.original.last_login_at
              ? formatTimestamp(row.original.last_login_at)
              : '-'}
          </span>
        ),
        size: 180,
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'status',
        header: t('Status'),
        cell: ({ row }) => {
          const config =
            USER_STATUSES[row.original.status as keyof typeof USER_STATUSES]
          const role = USER_ROLES[row.original.role as keyof typeof USER_ROLES]
          return (
            <div className='flex flex-col items-start gap-1'>
              {config ? (
                <StatusBadge
                  label={t(config.labelKey)}
                  variant={config.variant}
                  copyable={false}
                />
              ) : null}
              {role ? (
                <span className='text-muted-foreground text-xs'>
                  {t(role.labelKey)}
                </span>
              ) : null}
            </div>
          )
        },
        enableSorting: false,
        size: 110,
        meta: { mobileBadge: true },
      },
      {
        id: 'actions',
        header: t('Actions'),
        cell: ({ row }) => {
          const user = row.original
          return (
            <DataTableRowActionMenu ariaLabel={t('Open menu')}>
              <DropdownMenuItem
                onClick={() => options.onBlockIP(user.registration_ip)}
                disabled={!user.registration_ip || user.registration_ip_blocked}
              >
                {t('Block Registration IP')}
                <DropdownMenuShortcut>
                  <Ban size={16} />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => options.onDisableUsers([user])}
                disabled={user.status !== 1 || user.role === USER_ROLE.ROOT}
              >
                {t('Disable User')}
                <DropdownMenuShortcut>
                  <PowerOff size={16} />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  options.onDisableRelated(
                    [user.registration_ip],
                    'registration'
                  )
                }
                disabled={!user.registration_ip}
              >
                {t('Disable Same Registration IP Users')}
                <DropdownMenuShortcut>
                  <Users size={16} />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  options.onDisableRelated([user.last_login_ip], 'login')
                }
                disabled={!user.last_login_ip}
              >
                {t('Disable Same Login IP Users')}
                <DropdownMenuShortcut>
                  <Users size={16} />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            </DataTableRowActionMenu>
          )
        },
        enableSorting: false,
        meta: { pinned: 'right' as const },
      },
    ],
    [options, t]
  )
}
