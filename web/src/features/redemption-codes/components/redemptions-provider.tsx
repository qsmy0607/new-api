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
import React, { useCallback, useState } from 'react'

import useDialogState from '@/hooks/use-dialog'

import {
  DEFAULT_REDEMPTION_COPY_TEMPLATE,
  normalizeRedemptionCopyTemplate,
  REDEMPTION_COPY_TEMPLATE_STORAGE_KEY,
} from '../lib'
import type { Redemption, RedemptionsDialogType } from '../types'

type RedemptionsContextType = {
  open: RedemptionsDialogType | null
  setOpen: (str: RedemptionsDialogType | null) => void
  currentRow: Redemption | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Redemption | null>>
  refreshTrigger: number
  triggerRefresh: () => void
  redemptionCopyTemplate: string
  saveRedemptionCopyTemplate: (template: string) => string
}

const RedemptionsContext = React.createContext<RedemptionsContextType | null>(
  null
)

function getInitialRedemptionCopyTemplate(): string {
  if (typeof window === 'undefined') return DEFAULT_REDEMPTION_COPY_TEMPLATE

  try {
    return normalizeRedemptionCopyTemplate(
      window.localStorage.getItem(REDEMPTION_COPY_TEMPLATE_STORAGE_KEY)
    )
  } catch {
    return DEFAULT_REDEMPTION_COPY_TEMPLATE
  }
}

export function RedemptionsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useDialogState<RedemptionsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Redemption | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [redemptionCopyTemplate, setRedemptionCopyTemplate] = useState(
    getInitialRedemptionCopyTemplate
  )

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1)
  const saveRedemptionCopyTemplate = useCallback((template: string) => {
    const normalizedTemplate = normalizeRedemptionCopyTemplate(template)
    try {
      window.localStorage.setItem(
        REDEMPTION_COPY_TEMPLATE_STORAGE_KEY,
        normalizedTemplate
      )
    } catch {
      // Keep the setting active for this session when storage is unavailable.
    }
    setRedemptionCopyTemplate(normalizedTemplate)
    return normalizedTemplate
  }, [])

  return (
    <RedemptionsContext
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
        refreshTrigger,
        triggerRefresh,
        redemptionCopyTemplate,
        saveRedemptionCopyTemplate,
      }}
    >
      {children}
    </RedemptionsContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useRedemptions = () => {
  const redemptionsContext = React.useContext(RedemptionsContext)

  if (!redemptionsContext) {
    throw new Error(
      'useRedemptions has to be used within <RedemptionsProvider>'
    )
  }

  return redemptionsContext
}
