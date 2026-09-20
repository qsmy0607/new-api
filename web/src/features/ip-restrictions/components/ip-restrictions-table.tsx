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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import type { OnChangeFn, SortingState } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  DISABLED_ROW_DESKTOP,
  DISABLED_ROW_MOBILE,
  DataTablePage,
  useDataTable,
} from '@/components/data-table'
import { manageUser } from '@/features/users/api'
import { USER_STATUS } from '@/features/users/constants'
import { useMediaQuery } from '@/hooks'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { useAuthStore } from '@/stores/auth-store'

import {
  blockRegistrationIPs,
  getUserIPRisks,
  getUsersRelatedByIP,
} from '../api'
import { manageableUsers, uniqueIPs } from '../lib/ip-actions'
import type { IPAction, IPScope, UserIPRisk, UserIPRiskSortBy } from '../types'
import { IPActionDialog } from './ip-action-dialog'
import { IPRestrictionBulkActions } from './ip-restriction-bulk-actions'
import { useIPRestrictionColumns } from './ip-restriction-columns'

const route = getRouteApi('/_authenticated/system-settings/auth/$section')
const SORTABLE_COLUMNS = new Set<UserIPRiskSortBy>([
  'id',
  'created_at',
  'last_login_at',
  'registration_ip_count',
  'last_login_ip_count',
])

export function IPRestrictionsTable() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const currentRole = useAuthStore((state) => state.auth.user?.role ?? 0)
  const isMobile = useMediaQuery('(max-width: 640px)')
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'registration_ip_count', desc: true },
  ])
  const [pendingAction, setPendingAction] = useState<IPAction | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)

  const {
    globalFilter,
    onGlobalFilterChange,
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search: route.useSearch(),
    navigate: route.useNavigate(),
    pagination: { defaultPage: 1, defaultPageSize: isMobile ? 10 : 20 },
    globalFilter: { enabled: true, key: 'filter' },
  })

  const sortParams = useMemo(() => {
    const activeSort = sorting[0]
    if (
      !activeSort ||
      !SORTABLE_COLUMNS.has(activeSort.id as UserIPRiskSortBy)
    ) {
      return {}
    }
    return {
      sort_by: activeSort.id as UserIPRiskSortBy,
      sort_order: activeSort.desc ? ('desc' as const) : ('asc' as const),
    }
  }, [sorting])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'ip-restrictions',
      pagination.pageIndex + 1,
      pagination.pageSize,
      globalFilter,
      sortParams,
    ],
    queryFn: async () => {
      const result = await getUserIPRisks({
        p: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
        keyword: globalFilter,
        ...sortParams,
      })
      if (!result.success) {
        toast.error(result.message || t('Failed to load IP restrictions'))
        return { items: [], total: 0 }
      }
      return {
        items: result.data?.items ?? [],
        total: result.data?.total ?? 0,
      }
    },
    placeholderData: (previousData) => previousData,
  })

  const refreshData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['ip-restrictions'] }),
      queryClient.invalidateQueries({ queryKey: ['users'] }),
      queryClient.invalidateQueries({ queryKey: ['system-options'] }),
    ])
  }, [queryClient])

  const requestBlock = useCallback(
    (ips: string[]) => {
      const normalized = uniqueIPs(ips)
      if (normalized.length === 0) {
        toast.info(t('No registration IP selected'))
        return
      }
      setPendingAction({ kind: 'block', ips: normalized })
    },
    [t]
  )

  const requestDisableUsers = useCallback(
    (users: UserIPRisk[]) => {
      const manageable = manageableUsers(users, currentRole)
      if (manageable.length === 0) {
        toast.info(t('No manageable enabled users found'))
        return
      }
      setPendingAction({ kind: 'disable', users: manageable })
    },
    [currentRole, t]
  )

  const requestDisableRelated = useCallback(
    async (ips: string[], scope: IPScope) => {
      const normalized = uniqueIPs(ips)
      if (normalized.length === 0) {
        toast.info(t('No IP selected'))
        return
      }
      setIsActionLoading(true)
      try {
        const result = await getUsersRelatedByIP(normalized, scope)
        if (!result.success) {
          toast.error(result.message || t('Failed to load related users'))
          return
        }
        requestDisableUsers(result.data ?? [])
      } catch {
        toast.error(t('Failed to load related users'))
      } finally {
        setIsActionLoading(false)
      }
    },
    [requestDisableUsers, t]
  )

  const handleConfirm = async () => {
    if (!pendingAction) return
    setIsActionLoading(true)
    try {
      if (pendingAction.kind === 'block') {
        const result = await blockRegistrationIPs(pendingAction.ips)
        if (!result.success) {
          toast.error(result.message || t('Failed to block registration IPs'))
          return
        }
        toast.success(t('Registration IPs blocked successfully'))
      } else {
        let succeeded = 0
        for (let index = 0; index < pendingAction.users.length; index += 5) {
          const batch = pendingAction.users.slice(index, index + 5)
          const results = await Promise.allSettled(
            batch.map((user) => manageUser(user.id, 'disable'))
          )
          succeeded += results.filter(
            (result) => result.status === 'fulfilled' && result.value.success
          ).length
        }
        if (succeeded !== pendingAction.users.length) {
          toast.error(
            t('{{count}} users could not be disabled', {
              count: pendingAction.users.length - succeeded,
            })
          )
        }
        if (succeeded > 0) {
          toast.success(
            t('{{count}} users disabled successfully', { count: succeeded })
          )
        }
      }
      setPendingAction(null)
      await refreshData()
    } catch {
      toast.error(t('An unexpected error occurred'))
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleFilterIP = useCallback(
    (ip: string) => {
      onGlobalFilterChange?.(ip)
      if (pagination.pageIndex > 0) {
        onPaginationChange({ ...pagination, pageIndex: 0 })
      }
    },
    [onGlobalFilterChange, onPaginationChange, pagination]
  )

  const columnOptions = useMemo(
    () => ({
      onBlockIP: (ip: string) => requestBlock([ip]),
      onDisableRelated: requestDisableRelated,
      onDisableUsers: requestDisableUsers,
      onFilterIP: handleFilterIP,
    }),
    [handleFilterIP, requestBlock, requestDisableRelated, requestDisableUsers]
  )
  const columns = useIPRestrictionColumns(columnOptions)
  const users = data?.items ?? []

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting(updater)
    if (pagination.pageIndex > 0) {
      onPaginationChange({ ...pagination, pageIndex: 0 })
    }
  }

  const { table } = useDataTable({
    data: users,
    columns,
    enableRowSelection: true,
    columnFilters,
    globalFilter,
    pagination,
    sorting,
    onGlobalFilterChange,
    onColumnFiltersChange,
    onPaginationChange,
    onSortingChange: handleSortingChange,
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    totalCount: data?.total ?? 0,
    ensurePageInRange,
  })

  return (
    <>
      <DataTablePage
        table={table}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching || isActionLoading}
        emptyTitle={t('No IP Records Found')}
        emptyDescription={t(
          'IP data is recorded when users register or log in after this feature is enabled.'
        )}
        skeletonKeyPrefix='ip-restrictions-skeleton'
        applyHeaderSize
        toolbarProps={{
          searchPlaceholder: t('Filter by user, email or IP...'),
          searchDebounceMs: 400,
          filters: [],
        }}
        getRowClassName={(row, context) => {
          if (row.original.status !== USER_STATUS.DISABLED) return undefined
          return context.isMobile ? DISABLED_ROW_MOBILE : DISABLED_ROW_DESKTOP
        }}
        bulkActions={
          <IPRestrictionBulkActions
            table={table}
            onBlock={requestBlock}
            onDisableUsers={requestDisableUsers}
            onDisableRelated={(ips) =>
              void requestDisableRelated(ips, 'registration')
            }
          />
        }
      />
      <IPActionDialog
        action={pendingAction}
        isLoading={isActionLoading}
        onOpenChange={(open) => !open && setPendingAction(null)}
        onConfirm={() => void handleConfirm()}
      />
    </>
  )
}
