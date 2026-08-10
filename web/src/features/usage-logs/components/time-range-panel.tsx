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
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

interface TimeColumnProps {
  label: string
  ariaLabel: string
  value: number
  max: number
  onChange: (value: number) => void
}

function TimeColumn({
  label,
  ariaLabel,
  value,
  max,
  onChange,
}: TimeColumnProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const list = listRef.current
    const selected = selectedRef.current
    if (!list || !selected) return

    list.scrollTop = Math.max(
      0,
      selected.offsetTop - (list.clientHeight - selected.offsetHeight) / 2
    )
  }, [value])

  return (
    <div className='min-w-0'>
      <div className='text-muted-foreground flex h-7 items-center justify-center border-b text-xs'>
        {label}
      </div>
      <div
        ref={listRef}
        role='listbox'
        aria-label={ariaLabel}
        className='[&::-webkit-scrollbar-thumb]:bg-border h-48 touch-pan-y [scrollbar-width:thin] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full'
      >
        {Array.from({ length: max + 1 }, (_, option) => (
          <button
            key={option}
            ref={option === value ? selectedRef : undefined}
            type='button'
            role='option'
            aria-selected={option === value}
            className={cn(
              'hover:bg-muted focus-visible:ring-ring/50 flex h-8 w-full items-center justify-center text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-inset',
              option === value && 'bg-muted text-primary font-medium'
            )}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function parseTime(value: string): [number, number, number] {
  const [hour = 0, minute = 0, second = 0] = value.split(':').map(Number)
  return [hour, minute, second]
}

function updateTime(value: string, part: number, nextValue: number): string {
  const time = parseTime(value)
  time[part] = nextValue
  return time.map((valuePart) => String(valuePart).padStart(2, '0')).join(':')
}

interface TimeRangePanelProps {
  startTime: string
  endTime: string
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
}

export function TimeRangePanel({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
}: TimeRangePanelProps) {
  const { t } = useTranslation()
  const start = parseTime(startTime)
  const end = parseTime(endTime)
  const labels = [t('Hour'), t('Minute'), t('Second')]

  return (
    <div
      data-slot='time-range-panel'
      className='grid grid-cols-2 divide-x overflow-hidden border-y'
    >
      <div className='grid min-w-0 grid-cols-3 divide-x'>
        {labels.map((label, part) => (
          <TimeColumn
            key={label}
            label={label}
            ariaLabel={`${t('Start Time')} ${label}`}
            value={start[part] ?? 0}
            max={part === 0 ? 23 : 59}
            onChange={(value) =>
              onStartTimeChange(updateTime(startTime, part, value))
            }
          />
        ))}
      </div>
      <div className='grid min-w-0 grid-cols-3 divide-x'>
        {labels.map((label, part) => (
          <TimeColumn
            key={label}
            label={label}
            ariaLabel={`${t('End Time')} ${label}`}
            value={end[part] ?? 0}
            max={part === 0 ? 23 : 59}
            onChange={(value) =>
              onEndTimeChange(updateTime(endTime, part, value))
            }
          />
        ))}
      </div>
    </div>
  )
}
