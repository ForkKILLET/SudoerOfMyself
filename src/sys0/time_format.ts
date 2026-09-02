export interface DateTimeParts {
  year: number
  month: number
  day: number
  weekdayShort: string
  weekdayLong: string
  monthShort: string
  monthLong: string
  hour: number
  minute: number
  second: number
  timezoneName: string
  timezoneOffset: string
}

const partValue = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) => (
  parts.find(part => part.type === type)?.value ?? ''
)

const formatParts = (
  timestamp: number,
  timezone: string,
  options: Intl.DateTimeFormatOptions,
) => new Intl.DateTimeFormat('en-US', {
  timeZone: timezone,
  ...options,
}).formatToParts(new Date(timestamp))

const formatTimezoneOffset = (timestamp: number, timezone: string) => {
  const parts = formatParts(timestamp, timezone, { timeZoneName: 'longOffset' })
  const offset = partValue(parts, 'timeZoneName')
  if (offset === 'GMT') return '+0000'
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(offset)
  if (! match) return '+0000'
  const [, sign, hours, minutes = '00'] = match
  return `${sign}${hours.padStart(2, '0')}${minutes}`
}

export const getDateTimeParts = (timestamp: number, timezone: string): DateTimeParts => {
  const numeric = formatParts(timestamp, timezone, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const names = formatParts(timestamp, timezone, {
    weekday: 'long',
    month: 'long',
    timeZoneName: 'short',
  })
  const shortNames = formatParts(timestamp, timezone, {
    weekday: 'short',
    month: 'short',
  })
  return {
    year: Number(partValue(numeric, 'year')),
    month: Number(partValue(numeric, 'month')),
    day: Number(partValue(numeric, 'day')),
    weekdayShort: partValue(shortNames, 'weekday'),
    weekdayLong: partValue(names, 'weekday'),
    monthShort: partValue(shortNames, 'month'),
    monthLong: partValue(names, 'month'),
    hour: Number(partValue(numeric, 'hour')),
    minute: Number(partValue(numeric, 'minute')),
    second: Number(partValue(numeric, 'second')),
    timezoneName: partValue(names, 'timeZoneName'),
    timezoneOffset: formatTimezoneOffset(timestamp, timezone),
  }
}

const pad2 = (value: number) => value.toString().padStart(2, '0')

export const formatStrftime = (
  format: string,
  timestamp: number,
  timezone: string,
) => {
  const date = getDateTimeParts(timestamp, timezone)
  const hour12 = date.hour % 12 || 12
  return format.replace(/%[%aAbBdeFHImMnprRsStTyYzZ]/g, (sequence) => {
    switch (sequence) {
      case '%%': return '%'
      case '%a': return date.weekdayShort
      case '%A': return date.weekdayLong
      case '%b': return date.monthShort
      case '%B': return date.monthLong
      case '%d': return pad2(date.day)
      case '%e': return date.day.toString().padStart(2, ' ')
      case '%F': return `${date.year}-${pad2(date.month)}-${pad2(date.day)}`
      case '%H': return pad2(date.hour)
      case '%I': return pad2(hour12)
      case '%m': return pad2(date.month)
      case '%M': return pad2(date.minute)
      case '%n': return '\n'
      case '%p': return date.hour < 12 ? 'AM' : 'PM'
      case '%R': return `${pad2(date.hour)}:${pad2(date.minute)}`
      case '%s': return Math.floor(timestamp / 1_000).toString()
      case '%S': return pad2(date.second)
      case '%t': return '\t'
      case '%T': return `${pad2(date.hour)}:${pad2(date.minute)}:${pad2(date.second)}`
      case '%y': return pad2(date.year % 100)
      case '%Y': return date.year.toString()
      case '%z': return date.timezoneOffset
      case '%Z': return date.timezoneName
      default: return sequence
    }
  })
}
