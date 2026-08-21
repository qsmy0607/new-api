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
import { Mail } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Dialog } from '@/components/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useStatus } from '@/hooks/use-status'
import { parseHeaderNavModulesFromStatus } from '@/lib/nav-modules'

type ContactNavItemProps = {
  className?: string
  mobile?: boolean
  style?: React.CSSProperties
}

type ContactInfo = {
  email?: string
  wechatQRCodeUrl?: string
}

function ContactDetails(props: ContactInfo) {
  const { t } = useTranslation()

  return (
    <div className='flex flex-col gap-3'>
      {props.wechatQRCodeUrl ? (
        <img
          src={props.wechatQRCodeUrl}
          alt={t('Contact QR code')}
          className='mx-auto size-40 object-contain'
        />
      ) : null}
      {props.email ? (
        <div className='flex min-w-0 items-center gap-2 border-t pt-3'>
          <Mail className='text-muted-foreground size-4 shrink-0' />
          <a
            href={`mailto:${props.email}`}
            className='hover:text-primary min-w-0 flex-1 truncate text-sm underline-offset-4 hover:underline'
          >
            {props.email}
          </a>
          <CopyButton value={props.email} tooltip={t('Copy to clipboard')} />
        </div>
      ) : null}
    </div>
  )
}

export function ContactNavItem(props: ContactNavItemProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const config = parseHeaderNavModulesFromStatus(
    status as Record<string, unknown> | null
  )
  const email =
    typeof status?.contact_email === 'string' ? status.contact_email.trim() : ''
  const wechatQRCodeUrl =
    typeof status?.contact_wechat_qrcode_url === 'string'
      ? status.contact_wechat_qrcode_url.trim()
      : ''
  const contactInfo = {
    email: email || undefined,
    wechatQRCodeUrl: wechatQRCodeUrl || undefined,
  }

  if (!config.contact || !(email || wechatQRCodeUrl)) return null

  if (props.mobile) {
    return (
      <>
        <button
          type='button'
          className={props.className}
          style={props.style}
          onClick={() => setMobileOpen(true)}
        >
          {t('Contact us')}
        </button>
        <Dialog
          open={mobileOpen}
          onOpenChange={setMobileOpen}
          title={t('Contact us')}
          titleClassName='sr-only'
          contentClassName='sm:max-w-sm'
        >
          <ContactDetails {...contactInfo} />
        </Dialog>
      </>
    )
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type='button'
            className={props.className}
            style={props.style}
          />
        }
      >
        {t('Contact us')}
      </PopoverTrigger>
      <PopoverContent align='end' className='w-72 p-4'>
        <ContactDetails {...contactInfo} />
      </PopoverContent>
    </Popover>
  )
}
