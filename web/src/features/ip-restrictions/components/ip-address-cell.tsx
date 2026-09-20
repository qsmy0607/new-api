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

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type IPAddressCellProps = {
  blocked: boolean
  count: number
  ip: string
  onFilter: (ip: string) => void
}

export function IPAddressCell(props: IPAddressCellProps) {
  const { t } = useTranslation()
  if (!props.ip) {
    return <span className='text-muted-foreground text-sm'>-</span>
  }

  let countVariant: 'outline' | 'warning' | 'destructive' = 'outline'
  if (props.count >= 5) {
    countVariant = 'destructive'
  } else if (props.count >= 2) {
    countVariant = 'warning'
  }

  return (
    <div className='flex min-w-[175px] items-center gap-1.5'>
      <Button
        type='button'
        variant='link'
        size='sm'
        className='h-7 min-w-0 px-0 font-mono text-xs'
        onClick={() => props.onFilter(props.ip)}
        title={t('Filter by this IP')}
      >
        <span className='truncate'>{props.ip}</span>
      </Button>
      <Badge variant={countVariant}>{props.count}</Badge>
      {props.blocked ? (
        <Badge variant='destructive'>{t('Blocked')}</Badge>
      ) : null}
    </div>
  )
}
