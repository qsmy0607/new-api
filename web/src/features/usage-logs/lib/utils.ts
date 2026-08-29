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
/**
 * Utility functions for usage logs feature
 */
import dayjs from '@/lib/dayjs'

import {
  getAllLogs,
  getUserLogs,
  getAllMidjourneyLogs,
  getUserMidjourneyLogs,
  getAllTaskLogs,
  getUserTaskLogs,
} from '../api'
import {
  LOG_TYPES,
  DISPLAYABLE_LOG_TYPES,
  TIMING_LOG_TYPES,
} from '../constants'
import {
  LOG_TIME_PRESET_VALUES,
  type FetchLogsConfig,
  type GetLogsParams,
  type GetLogsResponse,
  type GetMidjourneyLogsParams,
  type GetTaskLogsParams,
  type LogTimePreset,
  type LogTimeSelection,
  type ResolvedLogTimeRange,
} from '../types'

export { buildQueryParams } from './query-params'

// ============================================================================
// Type Checkers & Utilities
// ============================================================================

/**
 * Check if log type is displayable (has detailed info)
 */
export function isDisplayableLogType(type: number): boolean {
  return (DISPLAYABLE_LOG_TYPES as readonly number[]).includes(type)
}

/**
 * Check if log type shows timing info
 */
export function isTimingLogType(type: number): boolean {
  return (TIMING_LOG_TYPES as readonly number[]).includes(type)
}

/**
 * Get log type configuration by type number
 */
export function getLogTypeConfig(type: number) {
  return LOG_TYPES.find((t) => t.value === type) || LOG_TYPES[0]
}

/**
 * Check if log uses per-call billing
 */
export function isPerCallBilling(modelPrice?: number): boolean {
  return (modelPrice ?? 0) > 0
}

/**
 * Get default time range (today 00:00:00.000 to 23:59:59.999)
 */
export function getDefaultTimeRange(referenceDate = new Date()): {
  start: Date
  end: Date
} {
  const start = new Date(referenceDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(referenceDate)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export function getMillisecondsUntilNextDay(
  referenceDate = new Date()
): number {
  const { start } = getDefaultTimeRange(referenceDate)
  const nextDay = new Date(start)
  nextDay.setDate(nextDay.getDate() + 1)
  return Math.max(1, nextDay.getTime() - referenceDate.getTime())
}

export function isLogTimePreset(value: unknown): value is LogTimePreset {
  return (
    typeof value === 'string' &&
    (LOG_TIME_PRESET_VALUES as readonly string[]).includes(value)
  )
}

export function parseLogTimeSelection(
  searchParams: Record<string, unknown>
): LogTimeSelection {
  const hasStartTime =
    typeof searchParams.startTime === 'number' &&
    Number.isFinite(searchParams.startTime)
  const hasEndTime =
    typeof searchParams.endTime === 'number' &&
    Number.isFinite(searchParams.endTime)

  if (hasStartTime || hasEndTime) {
    return {
      kind: 'custom',
      ...(hasStartTime
        ? { start: new Date(searchParams.startTime as number) }
        : {}),
      ...(hasEndTime ? { end: new Date(searchParams.endTime as number) } : {}),
    }
  }

  return {
    kind: 'preset',
    preset: isLogTimePreset(searchParams.rangePreset)
      ? searchParams.rangePreset
      : 'today',
  }
}

export function resolveLogTimeRange(
  selection: LogTimeSelection,
  referenceDate = new Date()
): ResolvedLogTimeRange {
  if (selection.kind === 'custom') {
    return { start: selection.start, end: selection.end }
  }

  const now = dayjs(referenceDate)
  const previousDay = now.subtract(1, 'day')
  const previousMonth = now.subtract(1, 'month')
  const presets: Record<LogTimePreset, ResolvedLogTimeRange> = {
    today: {
      start: now.startOf('day').toDate(),
      end: now.endOf('day').toDate(),
    },
    previousDayToDate: {
      start: previousDay.startOf('day').toDate(),
      end: previousDay.toDate(),
    },
    yesterday: {
      start: previousDay.startOf('day').toDate(),
      end: previousDay.endOf('day').toDate(),
    },
    last7Days: {
      start: now.subtract(6, 'day').startOf('day').toDate(),
      end: now.endOf('day').toDate(),
    },
    thisWeek: {
      start: now.startOf('week').toDate(),
      end: now.endOf('week').toDate(),
    },
    last30Days: {
      start: now.subtract(29, 'day').startOf('day').toDate(),
      end: now.endOf('day').toDate(),
    },
    thisMonth: {
      start: now.startOf('month').toDate(),
      end: now.endOf('month').toDate(),
    },
    previousMonthToDate: {
      start: previousMonth.startOf('month').toDate(),
      end: previousMonth.toDate(),
    },
  }

  return presets[selection.preset]
}

/**
 * Convert milliseconds timestamp to seconds for API
 */
function timestampToSeconds(ms: number): number {
  return Math.floor(ms / 1000)
}

/**
 * Build API time range parameters from the resolved UI range.
 */
function buildTimeRangeParams(
  timeRange: ResolvedLogTimeRange,
  useMilliseconds: boolean
): { start_timestamp?: number; end_timestamp?: number } {
  const convertTimestamp = (timestamp: number) =>
    useMilliseconds ? timestamp : timestampToSeconds(timestamp)

  return {
    start_timestamp: timeRange.start
      ? convertTimestamp(timeRange.start.getTime())
      : undefined,
    end_timestamp: timeRange.end
      ? convertTimestamp(timeRange.end.getTime())
      : undefined,
  }
}

/**
 * Build base parameters with time range (for drawing and task logs)
 * @param useMilliseconds - Whether to use millisecond timestamps (true for drawing logs, false for task logs)
 */
export function buildBaseParams(config: {
  page: number
  pageSize: number
  searchParams: Record<string, unknown>
  timeRange: ResolvedLogTimeRange
  useMilliseconds?: boolean
}): {
  p: number
  page_size: number
  channel_id?: string
  start_timestamp?: number
  end_timestamp?: number
} {
  const {
    page,
    pageSize,
    searchParams,
    timeRange,
    useMilliseconds = false,
  } = config

  return {
    p: page,
    page_size: pageSize,
    ...(searchParams.channel
      ? {
          channel_id: String(searchParams.channel),
        }
      : {}),
    ...buildTimeRangeParams(timeRange, useMilliseconds),
  }
}

/**
 * Build API params from search params and column filters (for common logs)
 */
export function buildApiParams(config: {
  page: number
  pageSize: number
  searchParams: Record<string, unknown>
  timeRange: ResolvedLogTimeRange
  columnFilters?: Array<{ id: string; value: unknown }>
  isAdmin: boolean
}): GetLogsParams {
  const {
    page,
    pageSize,
    searchParams,
    timeRange,
    columnFilters = [],
    isAdmin,
  } = config

  // Helper to process type parameter (single value from array)
  const processType = (value: unknown): number | undefined => {
    const parseType = (raw: unknown): number | undefined => {
      const type = Number(raw)
      return Number.isFinite(type) ? type : undefined
    }

    if (Array.isArray(value) && value.length === 1) {
      return parseType(value[0])
    }
    if (typeof value === 'string' && value !== '') {
      return parseType(value)
    }
    return undefined
  }

  // Build base params from search params
  const params: GetLogsParams = {
    p: page,
    page_size: pageSize,
    ...(searchParams.type ? { type: processType(searchParams.type) } : {}),
    ...(searchParams.model ? { model_name: String(searchParams.model) } : {}),
    ...(searchParams.token ? { token_name: String(searchParams.token) } : {}),
    ...(searchParams.group ? { group: String(searchParams.group) } : {}),
    ...(isAdmin && searchParams.channel
      ? { channel: Number(searchParams.channel) || 0 }
      : {}),
    ...(isAdmin && searchParams.username
      ? { username: String(searchParams.username) }
      : {}),
    ...(searchParams.requestId
      ? { request_id: String(searchParams.requestId) }
      : {}),
    ...(searchParams.upstreamRequestId
      ? { upstream_request_id: String(searchParams.upstreamRequestId) }
      : {}),
    ...buildTimeRangeParams(timeRange, false),
  }

  // Override with column filters if present
  if (columnFilters.length > 0) {
    columnFilters.forEach(({ id, value }) => {
      if (value === undefined || value === null || value === '') return

      switch (id) {
        case 'type':
          params.type = processType(value)
          break
        case 'model_name':
          params.model_name = String(value)
          break
        case 'token_name':
          params.token_name = String(value)
          break
        case 'group':
          params.group = String(value)
          break
        case 'channel':
          if (isAdmin) params.channel = Number(value) || 0
          break
        case 'username':
          if (isAdmin) params.username = String(value)
          break
      }
    })
  }

  return params
}

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Fetch logs based on category type
 */
export async function fetchLogsByCategory(
  config: FetchLogsConfig
): Promise<GetLogsResponse> {
  const {
    logCategory,
    isAdmin,
    page,
    pageSize,
    searchParams,
    columnFilters,
    timeRange,
  } = config

  if (logCategory === 'common') {
    const params = buildApiParams({
      page,
      pageSize,
      searchParams,
      timeRange,
      columnFilters,
      isAdmin,
    })
    return isAdmin ? await getAllLogs(params) : await getUserLogs(params)
  }

  // For drawing and task logs
  const baseParams = buildBaseParams({
    page,
    pageSize,
    searchParams,
    timeRange,
    useMilliseconds: logCategory === 'drawing',
  })

  const paramsWithFilter = {
    ...baseParams,
    ...(logCategory === 'drawing'
      ? { mj_id: searchParams.filter as string | undefined }
      : {}),
    ...(logCategory === 'task'
      ? { task_id: searchParams.filter as string | undefined }
      : {}),
  }

  if (logCategory === 'drawing') {
    return isAdmin
      ? await getAllMidjourneyLogs(paramsWithFilter as GetMidjourneyLogsParams)
      : await getUserMidjourneyLogs(paramsWithFilter as GetMidjourneyLogsParams)
  }

  // task logs
  return isAdmin
    ? await getAllTaskLogs(paramsWithFilter as GetTaskLogsParams)
    : await getUserTaskLogs(paramsWithFilter as GetTaskLogsParams)
}
