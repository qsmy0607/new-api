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
import { useQueryClient, useIsFetching } from '@tanstack/react-query'
import { useNavigate, getRouteApi } from '@tanstack/react-router'
import type { Table } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { buildSearchParams, canResetTaskLogFilters } from '../lib/filter'
import { parseLogTimeSelection, resolveLogTimeRange } from '../lib/utils'
import type {
  DrawingLogFilters,
  LogCategory,
  LogTimeSelection,
  TaskLogFilters,
} from '../types'
import { CompactDateTimeRangePicker } from './compact-date-time-range-picker'
import {
  LogsFilterField,
  LogsFilterInput,
  LogsFilterToolbar,
} from './logs-filter-toolbar'
import { useLogsViewScope, useUsageLogsContext } from './usage-logs-provider'

const route = getRouteApi('/_authenticated/usage-logs/$section')

type TaskLikeLogCategory = Extract<LogCategory, 'drawing' | 'task'>
type TaskLogsFilters = DrawingLogFilters | TaskLogFilters

type TaskLogsDraft = {
  sourceKey: string
  filters: TaskLogsFilters
}

interface TaskLogsFilterBarProps<TData> {
  table: Table<TData>
  logCategory: TaskLikeLogCategory
}

function getFilterValue(
  filters: TaskLogsFilters,
  logCategory: TaskLikeLogCategory
): string {
  if (logCategory === 'drawing') {
    return (filters as DrawingLogFilters).mjId || ''
  }
  return (filters as TaskLogFilters).taskId || ''
}

function setFilterValue(
  filters: TaskLogsFilters,
  logCategory: TaskLikeLogCategory,
  value: string
): TaskLogsFilters {
  if (logCategory === 'drawing') {
    return { ...filters, mjId: value }
  }
  return { ...filters, taskId: value }
}

export function TaskLogsFilterBar<TData>(props: TaskLogsFilterBarProps<TData>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const searchParams = route.useSearch()
  const { isAdminView: isAdmin } = useLogsViewScope()
  const { currentDayStart } = useUsageLogsContext()
  const fetchingLogs = useIsFetching({ queryKey: ['logs'] })

  const searchState = useMemo<TaskLogsDraft>(() => {
    const baseFilters = {
      timeRange: parseLogTimeSelection({
        rangePreset: searchParams.rangePreset,
        startTime: searchParams.startTime,
        endTime: searchParams.endTime,
      }),
      ...(searchParams.channel
        ? { channel: String(searchParams.channel) }
        : {}),
    }
    const next: TaskLogsFilters =
      props.logCategory === 'drawing'
        ? {
            ...baseFilters,
            ...(searchParams.filter ? { mjId: searchParams.filter } : {}),
          }
        : {
            ...baseFilters,
            ...(searchParams.filter ? { taskId: searchParams.filter } : {}),
          }

    return {
      sourceKey: [
        props.logCategory,
        searchParams.rangePreset,
        searchParams.startTime,
        searchParams.endTime,
        searchParams.channel,
        searchParams.filter,
      ]
        .map((value) => String(value ?? ''))
        .join('\u001f'),
      filters: next,
    }
  }, [
    props.logCategory,
    searchParams.rangePreset,
    searchParams.startTime,
    searchParams.endTime,
    searchParams.channel,
    searchParams.filter,
  ])
  const [draft, setDraft] = useState<TaskLogsDraft>(() => searchState)
  const activeDraft =
    draft.sourceKey === searchState.sourceKey ? draft : searchState
  const filters = activeDraft.filters
  const resolvedTimeRange = resolveLogTimeRange(
    filters.timeRange,
    new Date(currentDayStart)
  )

  const handleChange = useCallback(
    (
      field: Exclude<keyof TaskLogsFilters, 'timeRange'>,
      value: string | undefined
    ) => {
      setDraft((current) => {
        const base =
          current.sourceKey === searchState.sourceKey ? current : searchState
        return {
          sourceKey: searchState.sourceKey,
          filters: { ...base.filters, [field]: value },
        }
      })
    },
    [searchState]
  )

  const handleTimeRangeChange = useCallback(
    (timeRange: LogTimeSelection) => {
      setDraft((current) => {
        const base =
          current.sourceKey === searchState.sourceKey ? current : searchState
        return {
          sourceKey: searchState.sourceKey,
          filters: { ...base.filters, timeRange },
        }
      })
    },
    [searchState]
  )

  const handleApply = useCallback(() => {
    const filterParams = buildSearchParams(filters, props.logCategory)
    navigate({
      to: '/usage-logs/$section',
      params: { section: props.logCategory },
      search: {
        ...filterParams,
        page: 1,
      },
    })
    queryClient.invalidateQueries({ queryKey: ['logs'] })
  }, [filters, navigate, props.logCategory, queryClient])

  const handleReset = useCallback(() => {
    const resetFilters: TaskLogsFilters = {
      timeRange: { kind: 'preset', preset: 'today' },
    }
    setDraft({ sourceKey: searchState.sourceKey, filters: resetFilters })

    navigate({
      to: '/usage-logs/$section',
      params: { section: props.logCategory },
      search: {
        page: 1,
      },
    })
    queryClient.invalidateQueries({ queryKey: ['logs'] })
  }, [navigate, props.logCategory, queryClient, searchState.sourceKey])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleApply()
    },
    [handleApply]
  )

  const handleFilterChange = useCallback(
    (value: string) => {
      setDraft((current) => {
        const base =
          current.sourceKey === searchState.sourceKey ? current : searchState
        return {
          sourceKey: searchState.sourceKey,
          filters: setFilterValue(base.filters, props.logCategory, value),
        }
      })
    },
    [props.logCategory, searchState]
  )

  const filterValue = getFilterValue(filters, props.logCategory)
  const placeholder =
    props.logCategory === 'drawing'
      ? t('Filter by MjProxy task ID')
      : t('Filter by task ID')
  const hasAdditionalFilters = canResetTaskLogFilters(
    filters,
    searchState.filters,
    props.logCategory
  )
  const dateRangeFilter = (
    <LogsFilterField wide>
      <CompactDateTimeRangePicker
        start={resolvedTimeRange.start}
        end={resolvedTimeRange.end}
        onChange={handleTimeRangeChange}
      />
    </LogsFilterField>
  )
  const taskIdFilter = (
    <LogsFilterField>
      <LogsFilterInput
        aria-label={t('Task ID')}
        placeholder={placeholder}
        value={filterValue}
        onChange={(e) => handleFilterChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </LogsFilterField>
  )
  const channelFilter = isAdmin ? (
    <LogsFilterField>
      <LogsFilterInput
        placeholder={t('Channel ID')}
        value={filters.channel || ''}
        onChange={(e) => handleChange('channel', e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </LogsFilterField>
  ) : null

  return (
    <LogsFilterToolbar
      table={props.table}
      primaryFilters={
        <>
          {dateRangeFilter}
          {taskIdFilter}
          {channelFilter}
        </>
      }
      mobilePinnedFilters={dateRangeFilter}
      mobileFilters={
        <>
          {taskIdFilter}
          {channelFilter}
        </>
      }
      mobileFilterCount={[filterValue, filters.channel].filter(Boolean).length}
      hasActiveFilters={hasAdditionalFilters}
      onSearch={handleApply}
      searchLoading={fetchingLogs > 0}
      onReset={handleReset}
    />
  )
}
