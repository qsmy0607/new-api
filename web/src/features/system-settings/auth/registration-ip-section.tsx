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
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as z from 'zod'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import {
  SettingsForm,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useResetForm } from '../hooks/use-reset-form'
import { useUpdateOption } from '../hooks/use-update-option'

const registrationIPSchema = z.object({
  RegistrationIPBlacklist: z.string(),
  RegistrationIPBlacklistEnabled: z.boolean(),
})

type RegistrationIPFormValues = z.infer<typeof registrationIPSchema>

type RegistrationIPSectionProps = {
  defaultValues: RegistrationIPFormValues
}

export function RegistrationIPSection(props: RegistrationIPSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const form = useForm<RegistrationIPFormValues>({
    resolver: zodResolver(registrationIPSchema),
    defaultValues: props.defaultValues,
  })

  useResetForm(form, props.defaultValues)

  const onSubmit = async (data: RegistrationIPFormValues) => {
    if (
      data.RegistrationIPBlacklist !==
      props.defaultValues.RegistrationIPBlacklist
    ) {
      await updateOption.mutateAsync({
        key: 'RegistrationIPBlacklist',
        value: data.RegistrationIPBlacklist,
      })
    }
    if (
      data.RegistrationIPBlacklistEnabled !==
      props.defaultValues.RegistrationIPBlacklistEnabled
    ) {
      await updateOption.mutateAsync({
        key: 'RegistrationIPBlacklistEnabled',
        value: data.RegistrationIPBlacklistEnabled,
      })
    }
  }

  return (
    <SettingsSection title={t('Registration IP Blacklist')}>
      <Form {...form}>
        <SettingsForm onSubmit={form.handleSubmit(onSubmit)}>
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            isSaving={updateOption.isPending}
          />
          <FormField
            control={form.control}
            name='RegistrationIPBlacklistEnabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>{t('Enable registration IP blacklist')}</FormLabel>
                  <FormDescription>
                    {t(
                      'Block new registrations from listed IP addresses or networks'
                    )}
                  </FormDescription>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    aria-label={t('Enable registration IP blacklist')}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </SettingsSwitchItem>
            )}
          />

          <FormField
            control={form.control}
            name='RegistrationIPBlacklist'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Blocked IP addresses and networks')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t(
                      '203.0.113.10&#10;198.51.100.0/24&#10;2001:db8::/32'
                    )}
                    rows={8}
                    spellCheck={false}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('Enter one IP address or CIDR range per line')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}
