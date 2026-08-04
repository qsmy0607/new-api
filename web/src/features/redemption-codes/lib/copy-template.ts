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
export const REDEMPTION_COPY_TEMPLATE_STORAGE_KEY = 'redemption_copy_template'

export const DEFAULT_REDEMPTION_COPY_TEMPLATE =
  '您的兑换码：{{code}}。使用地址：https://newapi.zone，使用方式：个人中心-->钱包管理-->额度充值-->兑换码充值，输入该兑换码即可完成兑换。可使用codex、claude code，claude桌面端，以及各个API，使用方法见网站《文档》。'

export function normalizeRedemptionCopyTemplate(
  template: string | null | undefined
): string {
  return template || DEFAULT_REDEMPTION_COPY_TEMPLATE
}

export function formatRedemptionCopyText(
  template: string | null | undefined,
  code: string
): string {
  const normalizedTemplate = normalizeRedemptionCopyTemplate(template)
  if (normalizedTemplate.includes('{{code}}')) {
    return normalizedTemplate.replaceAll('{{code}}', code)
  }
  return `${normalizedTemplate}${code}`
}

export function formatRedemptionsCopyText(
  template: string | null | undefined,
  codes: string[]
): string {
  return codes
    .map((code) => formatRedemptionCopyText(template, code))
    .join('\n\n')
}
