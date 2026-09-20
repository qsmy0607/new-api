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
import type { Table } from '@tanstack/react-table'
import { Ban, PowerOff, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { DataTableBulkActions } from '@/components/data-table'
import { Button } from '@/components/ui/button'

import { uniqueIPs } from '../lib/ip-actions'
import type { UserIPRisk } from '../types'

type IPRestrictionBulkActionsProps = {
  table: Table<UserIPRisk>
  onBlock: (ips: string[]) => void
  onDisableRelated: (ips: string[]) => void
  onDisableUsers: (users: UserIPRisk[]) => void
}

export function IPRestrictionBulkActions(props: IPRestrictionBulkActionsProps) {
  const { t } = useTranslation()
  const users = props.table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.original)
  const registrationIPs = uniqueIPs(users.map((user) => user.registration_ip))

  return (
    <DataTableBulkActions table={props.table} entityName='user'>
      <Button
        size='sm'
        variant='outline'
        onClick={() => props.onBlock(registrationIPs)}
        disabled={registrationIPs.length === 0}
      >
        <Ban aria-hidden='true' />
        <span className='hidden md:inline'>{t('Block IPs')}</span>
      </Button>
      <Button
        size='sm'
        variant='outline'
        onClick={() => props.onDisableUsers(users)}
      >
        <PowerOff aria-hidden='true' />
        <span className='hidden md:inline'>{t('Disable Selected Users')}</span>
      </Button>
      <Button
        size='sm'
        variant='destructive'
        onClick={() => props.onDisableRelated(registrationIPs)}
        disabled={registrationIPs.length === 0}
      >
        <Users aria-hidden='true' />
        <span className='hidden md:inline'>
          {t('Disable Matching IP Users')}
        </span>
      </Button>
    </DataTableBulkActions>
  )
}
