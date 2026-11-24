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
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { ErrorState } from '@/components/error-state'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { handleServerError } from '@/lib/handle-server-error'
import { requireServerSuccess } from '@/lib/server-error-message'

import {
  SettingsForm,
  SettingsSwitchField,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'

const schema = z.object({
  enabled: z.boolean(),
  app_id: z.string().trim().max(64),
  app_secret: z.string().trim().max(256),
  template_id: z.string().trim().max(128),
  recipients: z.string().trim().max(1400),
})
type Config = z.infer<typeof schema>
type Entry = {
  id: number
  order_type: string
  trade_no: string
  amount: string
  recipient: string
  status: string
  attempts: number
  last_error: string
}
type Result = {
  success: boolean
  message?: string
  data: { config: Config & { secret_configured: boolean }; recent: Entry[] }
}
const endpoint = '/api/option/wechat-order'
const queryKey = ['wechat-order-notifications']

export function WeChatOrderSettingsSection() {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey,
    queryFn: async () =>
      requireServerSuccess((await api.get<Result>(endpoint)).data).data,
    refetchInterval: 15000,
  })
  if (query.isPending) return <p role='status'>{t('Loading...')}</p>
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />
  return (
    <WeChatOrderForm config={query.data.config} recent={query.data.recent} />
  )
}

function WeChatOrderForm(props: {
  config: Config & { secret_configured: boolean }
  recent: Entry[]
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const form = useForm<Config>({
    resolver: zodResolver(schema),
    defaultValues: { ...props.config, app_secret: '' },
  })
  const save = useMutation({
    mutationFn: async (values: Config) =>
      requireServerSuccess((await api.put<Result>(endpoint, values)).data),
    onSuccess: (_, values) => {
      form.reset({ ...values, app_secret: '' })
      void queryClient.invalidateQueries({ queryKey })
      toast.success(t('Setting updated successfully'))
    },
    onError: (error) => handleServerError(error),
  })
  const test = useMutation({
    mutationFn: async () =>
      requireServerSuccess((await api.post<Result>(`${endpoint}/test`)).data),
    onSuccess: () => toast.success(t('WeChat test notification accepted.')),
    onError: (error) => handleServerError(error),
  })
  const retry = useMutation({
    mutationFn: async (id: number) =>
      requireServerSuccess(
        (await api.post<Result>(`${endpoint}/retry`, { id })).data
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => handleServerError(error),
  })
  const busy = save.isPending || test.isPending
  return (
    <SettingsSection title={t('WeChat Order Notifications')}>
      <p className='text-muted-foreground text-sm'>
        {t(
          'Notify administrators after online top-ups and subscription payments. Save settings before testing. Order times use UTC+8.'
        )}
      </p>
      <Form {...form}>
        <SettingsForm
          onSubmit={form.handleSubmit((values) => save.mutate(values))}
        >
          <SettingsPageFormActions
            onSave={form.handleSubmit((values) => save.mutate(values))}
            isSaving={save.isPending}
            isSaveDisabled={busy}
            onReset={() => form.reset({ ...props.config, app_secret: '' })}
          />
          <FormField
            control={form.control}
            name='enabled'
            render={({ field }) => (
              <SettingsSwitchField
                controlId='wechat-order-enabled'
                checked={field.value}
                onCheckedChange={field.onChange}
                label={t('Enable WeChat order notifications')}
                disabled={busy}
              />
            )}
          />
          <FormField
            control={form.control}
            name='app_id'
            render={({ field }) => (
              <FormItem>
                <FormLabel>AppID</FormLabel>
                <FormControl>
                  <Input {...field} disabled={busy} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='app_secret'
            render={({ field }) => (
              <FormItem>
                <FormLabel>AppSecret</FormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    autoComplete='new-password'
                    disabled={busy}
                  />
                </FormControl>
                <p className='text-muted-foreground text-xs'>
                  {props.config.secret_configured
                    ? t('Leave blank to keep the saved secret.')
                    : t('Enter the WeChat AppSecret.')}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='template_id'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('WeChat template ID')}</FormLabel>
                <FormControl>
                  <Input {...field} disabled={busy} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='recipients'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Recipient OpenIDs')}</FormLabel>
                <FormControl>
                  <Textarea {...field} disabled={busy} />
                </FormControl>
                <p className='text-muted-foreground text-xs'>
                  {t(
                    'Recipients must follow this account. Separate up to 20 OpenIDs with commas or new lines.'
                  )}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <div>
            <Button
              type='button'
              variant='outline'
              disabled={busy || form.formState.isDirty}
              onClick={() => test.mutate()}
            >
              {t('Send test notification')}
            </Button>
          </div>
        </SettingsForm>
      </Form>
      <h4 className='text-sm font-medium'>
        {t('Recent WeChat order notifications')}
      </h4>
      {props.recent.length === 0 ? (
        <p className='text-muted-foreground text-sm'>
          {t('No order notifications yet.')}
        </p>
      ) : (
        <ul className='space-y-3'>
          {props.recent.map((entry) => (
            <li
              key={entry.id}
              className='flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm'
            >
              <div className='min-w-0 break-all'>
                <p>
                  {entry.order_type === 'subscription'
                    ? t('Subscription')
                    : t('Top-up')}
                  : {entry.trade_no} ? {entry.amount}
                </p>
                <p className='text-muted-foreground'>{entry.recipient}</p>
                <p>
                  {entry.status === 'sent' && t('Accepted by WeChat')}
                  {entry.status === 'failed' && t('Failed')}
                  {entry.status === 'sending' && t('Sending...')}
                  {entry.status === 'pending' && t('Pending')}
                </p>
                {entry.last_error && (
                  <p className='text-destructive'>{entry.last_error}</p>
                )}
              </div>
              {entry.status === 'failed' && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={retry.isPending}
                  onClick={() => retry.mutate(entry.id)}
                >
                  {t('Retry')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  )
}
