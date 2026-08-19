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
import {
  ArrowLeft01Icon,
  ArrowLeftDoubleIcon,
  ArrowRight01Icon,
  ArrowRightDoubleIcon,
  CalendarDaysIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { type MouseEvent, useRef, useState } from 'react'
import { type DateRange, type NavProps, useDayPicker } from 'react-day-picker'
import { enUS, fr, ja, ru, vi, zhCN, zhTW } from 'react-day-picker/locale'
import { useTranslation } from 'react-i18next'

import { Button, buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useMediaQuery } from '@/hooks'
import dayjs from '@/lib/dayjs'
import { cn } from '@/lib/utils'

import { resolveLogTimeRange } from '../lib/utils'
import type { LogTimePreset, LogTimeSelection } from '../types'
import { TimeRangePanel } from './time-range-panel'

interface CompactDateTimeRangePickerProps {
  start?: Date
  end?: Date
  onChange: (selection: LogTimeSelection) => void
  showQuickRanges?: boolean
  className?: string
}

type PickerPanel = 'date' | 'time'

const calendarLocales = {
  en: enUS,
  fr,
  ru,
  ja,
  vi,
} as const

function CalendarRangeNav(props: NavProps) {
  const { t } = useTranslation()
  const { months, goToMonth } = useDayPicker()
  const displayedMonth = months[0]?.date

  return (
    <nav className={props.className} aria-label={t('Date Range')}>
      <div className='flex gap-0.5'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-(--cell-size)'
          aria-label={t('Previous year')}
          title={t('Previous year')}
          disabled={!displayedMonth}
          onClick={() => {
            if (displayedMonth) {
              goToMonth(dayjs(displayedMonth).subtract(1, 'year').toDate())
            }
          }}
        >
          <HugeiconsIcon icon={ArrowLeftDoubleIcon} />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-(--cell-size)'
          aria-label={t('Previous month')}
          title={t('Previous month')}
          disabled={!props.previousMonth}
          onClick={props.onPreviousClick}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} />
        </Button>
      </div>
      <div className='flex gap-0.5'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-(--cell-size)'
          aria-label={t('Next month')}
          title={t('Next month')}
          disabled={!props.nextMonth}
          onClick={props.onNextClick}
        >
          <HugeiconsIcon icon={ArrowRight01Icon} />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-(--cell-size)'
          aria-label={t('Next year')}
          title={t('Next year')}
          disabled={!displayedMonth}
          onClick={() => {
            if (displayedMonth) {
              goToMonth(dayjs(displayedMonth).add(1, 'year').toDate())
            }
          }}
        >
          <HugeiconsIcon icon={ArrowRightDoubleIcon} />
        </Button>
      </div>
    </nav>
  )
}

const rangeCalendarComponents = { Nav: CalendarRangeNav }

function toDateValue(date?: Date): string {
  return date ? dayjs(date).format('YYYY-MM-DD') : ''
}

function toTimeValue(date?: Date): string {
  return date ? dayjs(date).format('HH:mm:ss') : '00:00:00'
}

function fromDateValue(value: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return undefined
  return dayjs(date).format('YYYY-MM-DD') === value ? date : undefined
}

function fromDateAndTime(
  dateValue: string,
  timeValue: string
): Date | undefined {
  if (!fromDateValue(dateValue)) return undefined
  const date = new Date(`${dateValue}T${timeValue || '00:00:00'}`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function CompactDateTimeRangePicker({
  start,
  end,
  onChange,
  showQuickRanges = false,
  className,
}: CompactDateTimeRangePickerProps) {
  const { t, i18n } = useTranslation()
  const isNarrow = useMediaQuery('(max-width: 767px)')
  const pickerRef = useRef<HTMLDivElement>(null)
  const [openPanel, setOpenPanel] = useState<PickerPanel | null>(null)
  const [draftStartDate, setDraftStartDate] = useState(toDateValue(start))
  const [draftStartTime, setDraftStartTime] = useState(toTimeValue(start))
  const [draftEndDate, setDraftEndDate] = useState(toDateValue(end))
  const [draftEndTime, setDraftEndTime] = useState(toTimeValue(end))

  const selectedStart = fromDateValue(draftStartDate)
  const selectedEnd = fromDateValue(draftEndDate)
  const selectedRange: DateRange | undefined = selectedStart
    ? { from: selectedStart, to: selectedEnd }
    : undefined
  const language = (
    i18n.resolvedLanguage ||
    i18n.language ||
    'en'
  ).toLowerCase()
  const isTraditionalChinese =
    language.startsWith('zh-tw') ||
    language.startsWith('zh-hk') ||
    language.startsWith('zh-mo') ||
    language.startsWith('zh-hant')
  let calendarLocale = enUS
  if (language.startsWith('zh')) {
    calendarLocale = isTraditionalChinese ? zhTW : zhCN
  } else {
    const languageCode = language.split('-')[0]
    calendarLocale =
      calendarLocales[languageCode as keyof typeof calendarLocales] ?? enUS
  }

  const hasRangeValue = !!start || !!end
  const startDateText = start ? dayjs(start).format('YYYY-MM-DD') : '-'
  const startTimeText = start ? dayjs(start).format('HH:mm:ss') : '--:--:--'
  const endDateText = end ? dayjs(end).format('YYYY-MM-DD') : '-'
  const endTimeText = end ? dayjs(end).format('HH:mm:ss') : '--:--:--'

  const updateSelection = (
    startDateValue: string,
    startTimeValue: string,
    endDateValue: string,
    endTimeValue: string
  ) => {
    onChange({
      kind: 'custom',
      start: fromDateAndTime(startDateValue, startTimeValue),
      end: fromDateAndTime(endDateValue, endTimeValue),
    })
  }

  const handlePanelOpenChange = (
    targetPanel: PickerPanel,
    nextOpen: boolean
  ) => {
    if (!nextOpen) {
      setOpenPanel((currentPanel) =>
        currentPanel === targetPanel ? null : currentPanel
      )
      return
    }

    setDraftStartDate(toDateValue(start))
    setDraftStartTime(toTimeValue(start))
    setDraftEndDate(toDateValue(end))
    setDraftEndTime(toTimeValue(end))
    setOpenPanel(targetPanel)
  }

  const handlePickerClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.target as Node)) return
    handlePanelOpenChange('date', openPanel !== 'date')
  }

  const handleRangeSelect = (range: DateRange | undefined) => {
    const nextStartDate = toDateValue(range?.from)
    const nextEndDate = toDateValue(range?.to)
    setDraftStartDate(nextStartDate)
    setDraftEndDate(nextEndDate)
    updateSelection(nextStartDate, draftStartTime, nextEndDate, draftEndTime)
  }

  const handleQuickRangeSelect = (preset: LogTimePreset) => {
    if (preset === 'previousDayToDate' || preset === 'previousMonthToDate') {
      const resolvedRange = resolveLogTimeRange({ kind: 'preset', preset })
      onChange({
        kind: 'custom',
        start: resolvedRange.start,
        end: resolvedRange.end,
      })
    } else {
      onChange({ kind: 'preset', preset })
    }
    setOpenPanel(null)
  }

  const handleStartTimeChange = (nextStartTime: string) => {
    setDraftStartTime(nextStartTime)
    updateSelection(draftStartDate, nextStartTime, draftEndDate, draftEndTime)
  }

  const handleEndTimeChange = (nextEndTime: string) => {
    setDraftEndTime(nextEndTime)
    updateSelection(draftStartDate, draftStartTime, draftEndDate, nextEndTime)
  }

  return (
    <div
      ref={pickerRef}
      role='group'
      aria-label={t('Date Range')}
      onClick={handlePickerClick}
      className={cn(
        buttonVariants({ variant: 'outline', size: 'lg' }),
        'w-full cursor-pointer justify-start gap-1 overflow-hidden px-2.5 text-sm leading-5 font-normal tabular-nums',
        !hasRangeValue && 'text-muted-foreground',
        className
      )}
    >
      <HugeiconsIcon
        icon={CalendarDaysIcon}
        data-icon='inline-start'
        className='text-muted-foreground'
      />
      <Popover
        open={openPanel === 'date'}
        onOpenChange={(nextOpen, eventDetails) => {
          const eventTarget = eventDetails.event.target
          if (
            !nextOpen &&
            eventDetails.reason === 'outside-press' &&
            eventTarget instanceof Node &&
            pickerRef.current?.contains(eventTarget)
          ) {
            eventDetails.cancel()
            return
          }
          handlePanelOpenChange('date', nextOpen)
        }}
      >
        <PopoverTrigger
          render={
            <button
              type='button'
              className='hover:text-primary focus-visible:ring-ring/50 min-w-0 shrink rounded-sm outline-none hover:underline focus-visible:ring-2'
              aria-label={`${t('Start Time')}: ${t('Select date')}`}
              onClick={(event) => event.stopPropagation()}
            />
          }
        >
          <span className='truncate'>
            {hasRangeValue ? startDateText : t('Date Range')}
          </span>
        </PopoverTrigger>
        <PopoverContent
          align='start'
          className='w-[min(420px,calc(100vw-1rem))] p-2'
        >
          <div className='overflow-x-auto'>
            <Calendar
              mode='range'
              selected={selectedRange}
              onSelect={handleRangeSelect}
              defaultMonth={selectedStart ?? new Date()}
              numberOfMonths={isNarrow ? 1 : 2}
              pagedNavigation={!isNarrow}
              fixedWeeks
              locale={calendarLocale}
              components={rangeCalendarComponents}
              className='mx-auto p-0 [--cell-size:--spacing(6)]'
            />
          </div>
          {showQuickRanges && (
            <div className='mt-2 grid grid-cols-2 gap-1 border-t pt-2 sm:grid-cols-3'>
              <Button
                type='button'
                variant='secondary'
                size='sm'
                className='text-xs'
                onClick={() => handleQuickRangeSelect('today')}
              >
                {t('Today')}
              </Button>
              <Button
                type='button'
                variant='secondary'
                size='sm'
                className='text-xs'
                onClick={() => handleQuickRangeSelect('previousDayToDate')}
              >
                {t('Previous day to date')}
              </Button>
              <Button
                type='button'
                variant='secondary'
                size='sm'
                className='text-xs'
                onClick={() => handleQuickRangeSelect('yesterday')}
              >
                {t('Yesterday')}
              </Button>
              <Button
                type='button'
                variant='secondary'
                size='sm'
                className='text-xs'
                onClick={() => handleQuickRangeSelect('thisMonth')}
              >
                {t('This month')}
              </Button>
              <Button
                type='button'
                variant='secondary'
                size='sm'
                className='text-xs'
                onClick={() => handleQuickRangeSelect('previousMonthToDate')}
              >
                {t('Previous month to date')}
              </Button>
              <Button
                type='button'
                variant='secondary'
                size='sm'
                className='text-xs'
                onClick={() => handleQuickRangeSelect('last30Days')}
              >
                {t('30 days')}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {hasRangeValue && (
        <>
          <Popover
            open={openPanel === 'time'}
            onOpenChange={(nextOpen) => handlePanelOpenChange('time', nextOpen)}
          >
            <PopoverTrigger
              render={
                <button
                  type='button'
                  className='hover:text-primary focus-visible:ring-ring/50 shrink-0 rounded-sm outline-none hover:underline focus-visible:ring-2'
                  aria-label={t('Start Time')}
                  onClick={(event) => event.stopPropagation()}
                />
              }
            >
              {startTimeText}
            </PopoverTrigger>
            <PopoverContent
              align='end'
              className='w-[min(420px,calc(100vw-1rem))] p-2'
            >
              <TimeRangePanel
                startTime={draftStartTime}
                endTime={draftEndTime}
                onStartTimeChange={handleStartTimeChange}
                onEndTimeChange={handleEndTimeChange}
              />
            </PopoverContent>
          </Popover>

          <span className='text-muted-foreground shrink-0'>~</span>
          <button
            type='button'
            className='hover:text-primary focus-visible:ring-ring/50 shrink-0 rounded-sm outline-none hover:underline focus-visible:ring-2'
            aria-label={`${t('End Time')}: ${t('Select date')}`}
            onClick={(event) => {
              event.stopPropagation()
              handlePanelOpenChange('date', openPanel !== 'date')
            }}
          >
            {endDateText}
          </button>
          <button
            type='button'
            className='hover:text-primary focus-visible:ring-ring/50 shrink-0 rounded-sm outline-none hover:underline focus-visible:ring-2'
            aria-label={t('End Time')}
            onClick={(event) => {
              event.stopPropagation()
              handlePanelOpenChange('time', openPanel !== 'time')
            }}
          >
            {endTimeText}
          </button>
        </>
      )}
    </div>
  )
}
