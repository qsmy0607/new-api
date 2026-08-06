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
 * Utility functions for usage logs filters
 */
import { LOG_CATEGORY_LABELS, LOG_TYPE_ALL_VALUE } from '../constants'
import type {
  CommonLogFilters,
  DrawingLogFilters,
  LogCategory,
  LogFilters,
  TaskLogFilters,
} from '../types'

// ============================================================================
// Filter Building Functions
// ============================================================================

function hasNonDefaultTimeRange(filters: LogFilters): boolean {
  return (
    filters.timeRange.kind === 'custom' || filters.timeRange.preset !== 'today'
  )
}

function hasNonDefaultLogType(value: unknown): boolean {
  let values: unknown[]
  if (Array.isArray(value)) {
    values = value
  } else if (value === undefined || value === null || value === '') {
    values = []
  } else {
    values = [value]
  }

  return (
    values.length !== 0 &&
    (values.length !== 1 || String(values[0]) !== LOG_TYPE_ALL_VALUE)
  )
}

function hasNonDefaultCommonLogFilters(
  filters: CommonLogFilters,
  logType: unknown
): boolean {
  return (
    hasNonDefaultTimeRange(filters) ||
    hasNonDefaultLogType(logType) ||
    !!filters.model ||
    !!filters.group ||
    !!filters.token ||
    !!filters.username ||
    !!filters.channel ||
    !!filters.requestId ||
    !!filters.upstreamRequestId
  )
}

export function canResetCommonLogFilters(
  currentFilters: CommonLogFilters,
  currentLogType: unknown,
  appliedFilters: CommonLogFilters,
  appliedLogType: unknown
): boolean {
  return (
    hasNonDefaultCommonLogFilters(currentFilters, currentLogType) ||
    hasNonDefaultCommonLogFilters(appliedFilters, appliedLogType)
  )
}

function hasNonDefaultTaskLogFilters(
  filters: DrawingLogFilters | TaskLogFilters,
  logCategory: Extract<LogCategory, 'drawing' | 'task'>
): boolean {
  const taskId =
    logCategory === 'drawing'
      ? (filters as DrawingLogFilters).mjId
      : (filters as TaskLogFilters).taskId

  return hasNonDefaultTimeRange(filters) || !!taskId || !!filters.channel
}

export function canResetTaskLogFilters(
  currentFilters: DrawingLogFilters | TaskLogFilters,
  appliedFilters: DrawingLogFilters | TaskLogFilters,
  logCategory: Extract<LogCategory, 'drawing' | 'task'>
): boolean {
  return (
    hasNonDefaultTaskLogFilters(currentFilters, logCategory) ||
    hasNonDefaultTaskLogFilters(appliedFilters, logCategory)
  )
}

/**
 * Build search params from filters based on log category
 */
export function buildSearchParams(
  filters: LogFilters,
  logCategory: LogCategory
): Record<string, unknown> {
  let timeParams: Record<string, unknown> = {}
  if (
    filters.timeRange.kind === 'preset' &&
    filters.timeRange.preset !== 'today'
  ) {
    timeParams = { rangePreset: filters.timeRange.preset }
  } else if (filters.timeRange.kind === 'custom') {
    timeParams = {
      ...(filters.timeRange.start && {
        startTime: filters.timeRange.start.getTime(),
      }),
      ...(filters.timeRange.end && {
        endTime: filters.timeRange.end.getTime(),
      }),
    }
  }
  const baseParams: Record<string, unknown> = {
    ...timeParams,
    ...(filters.channel && { channel: filters.channel }),
  }

  switch (logCategory) {
    case 'common': {
      const commonFilters = filters as CommonLogFilters
      return {
        ...baseParams,
        ...(commonFilters.model && { model: commonFilters.model }),
        ...(commonFilters.token && { token: commonFilters.token }),
        ...(commonFilters.group && { group: commonFilters.group }),
        ...(commonFilters.username && { username: commonFilters.username }),
        ...(commonFilters.requestId && { requestId: commonFilters.requestId }),
        ...(commonFilters.upstreamRequestId && {
          upstreamRequestId: commonFilters.upstreamRequestId,
        }),
      }
    }
    case 'drawing': {
      const drawingFilters = filters as DrawingLogFilters
      return {
        ...baseParams,
        ...(drawingFilters.mjId && { filter: drawingFilters.mjId }),
      }
    }
    case 'task': {
      const taskFilters = filters as TaskLogFilters
      return {
        ...baseParams,
        ...(taskFilters.taskId && { filter: taskFilters.taskId }),
      }
    }
    default:
      return baseParams
  }
}

/**
 * Get log category display name
 */
export function getLogCategoryLabel(category: LogCategory): string {
  return LOG_CATEGORY_LABELS[category]
}
