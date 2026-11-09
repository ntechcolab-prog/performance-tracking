import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AppsGrid, Calendar, Bell, ChevronDown } from '../icons/Icons'
import { BatchBookMark, BATCH_BOOK_GLYPH } from '../../shared/viz/BatchBookMark'
import { useSession, initialsOf } from '@/src/shared/client/Session'
import { useLocalStorage } from '../../shared/lib/useLocalStorage'
import { buildWeeks } from '../../shared/lib/weeks'
import { useAvailabilitySettings, useAvailabilityPlan, useWorkingHolidays, isoOf, clampDayHours } from '../../shared/lib/availability'
import { useHolidays } from '../../shared/lib/holidays'
import { availabilityService } from '../../shared/data/availabilityData'

interface AppHeaderProps {
  name: string
  icon: string | null
  restricted?: boolean
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface Notification {
  id: number
  text: string
  time: string
  read: boolean
}

const INITIAL_NOTIFS: Notification[] = [
  { id: 1, text: 'Batch #12003 finished on Zeta 10.', time: '2 min ago', read: false },
  { id: 2, text: 'Maintenance due on Alpha Zeta 10.', time: '1 h ago', read: false },
  { id: 3, text: 'OEE dropped below target on Line B.', time: '3 h ago', read: false },
  { id: 4, text: 'Monthly report for March is ready.', time: 'Yesterday', read: true },
]

export default function AppHeader({ name, icon, restricted = false }: AppHeaderProps) {
  const user = useSession()
  const [notifs, setNotifs] = useState<Notification[]>(INITIAL_NOTIFS)
  const unread = notifs.filter((n) => !n.read).length

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-header px-4 text-white">
      <div className="flex items-center gap-1.5">
        {/* NETZSCH product launcher */}
        <Popover
          icon={<AppsGrid size={20} />}
          align="left"
          panelClassName="w-80"
          render={(close) => <ProductLauncher onPick={close} />}
        />

        <div className="ml-1 flex items-center gap-3">
        {icon ? (
          <img src={icon} alt="" className="h-8 w-auto max-w-[10rem] object-contain" />
        ) : (
          <BatchBookMark size={32} />
        )}
        <span className="text-base font-medium tracking-tight">{name}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {!restricted && (
          <>
            {/* Calendar */}
            <Popover
              icon={<Calendar size={20} />}
              align="right"
              panelClassName="w-72"
              render={() => <MiniCalendar />}
            />

            {/* Notifications */}
            <Popover
              icon={<Bell size={20} />}
              align="right"
              panelClassName="w-80"
              badge={unread}
              render={() => (
                <Notifications
                  notifs={notifs}
                  onRead={(id) => setNotifs((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n)))}
                  onReadAll={() => setNotifs((ns) => ns.map((n) => ({ ...n, read: true })))}
                />
              )}
            />
          </>
        )}

        <div className="mx-1 hidden items-center gap-2 sm:flex">
          <span className="text-sm text-white/80">Hello,</span>
        </div>

        {/* Account menu (gear) */}
        <Popover
          align="right"
          panelClassName="w-56"
          trigger={
            <span className="flex items-center gap-1.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-[0.6875rem] font-bold uppercase">
                {initialsOf(user.name)}
              </span>
              <ChevronDown size={14} className="text-white/70" />
            </span>
          }
          render={() => <AccountMenu />}
        />
      </div>
    </header>
  )
}

interface PopoverProps {
  icon?: ReactNode
  trigger?: ReactNode
  badge?: number
  align?: 'left' | 'right'
  panelClassName?: string
  render: (close: () => void) => ReactNode
}

function Popover({ icon, trigger, badge, align = 'right', panelClassName = '', render }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 min-w-9 place-items-center rounded-md px-1 text-white/80 hover:bg-white/10"
      >
        {trigger ?? icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-down px-1 text-[0.625rem] font-bold text-white">
            {badge}
          </span>
        )}
      </button>
      {open && (
        <div
          className={`absolute top-full z-40 mt-2 overflow-hidden rounded-xl border border-line bg-white text-ink shadow-pop ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${panelClassName}`}
        >
          {render(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Header mini-calendar wired to availability: each planned day shows whether it
// met the monthly goal (teal) or fell short (amber); holidays get a dot; hover
// surfaces a rich tooltip (availability %, planned vs executed, goal, holiday).
function MiniCalendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<number | null>(null)

  const [settings] = useAvailabilitySettings()
  const [plan, setPlan] = useAvailabilityPlan()
  const wh = useWorkingHolidays()
  const holidays = useHolidays(year)
  const goal = settings.monthlyGoalPct

  const weeks = buildWeeks(year, month)

  const series = useMemo(
    () => availabilityService.monthSeries(year, month, plan, settings, holidays.set, wh.set),
    [year, month, plan, settings, holidays.set, wh.set]
  )

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setSelected(null)
  }

  const todayIso = isoOf(now.getFullYear(), now.getMonth(), now.getDate())
  const setDayHours = (iso: string, h: number) => setPlan((prev) => ({ ...prev, [iso]: clampDayHours(h) }))

  // Selected-day editor data
  const selIso = selected != null ? isoOf(year, month, selected) : null
  const selDay = selIso ? availabilityService.day(selIso, plan, settings, holidays.set, wh.set) : null
  const selHoliday = selIso ? holidays.set.has(selIso) : false

  return (
    <div className="relative p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <button onClick={() => shift(-1)} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-page">‹</button>
        <span className="text-sm font-semibold">{MONTH_NAMES[month]} {year}</span>
        <button onClick={() => shift(1)} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-page">›</button>
      </div>
      <div className="grid grid-cols-7 text-center text-[0.625rem] text-muted">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} className="py-1">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {weeks.flat().map((day, i) => {
          if (day == null) return <div key={i} className="h-9" />
          const iso = isoOf(year, month, day)
          const planned = series.planned[day - 1] ?? 0
          const executed = series.executed[day - 1] ?? 0
          const pct = series.pct[day - 1] ?? 0
          const isHoliday = holidays.set.has(iso)
          const isToday = iso === todayIso
          const hasPlan = planned > 0
          const met = hasPlan && pct >= goal

          let dot = ''
          if (hasPlan) dot = met ? 'bg-primary' : 'bg-warning'

          // rich tooltip
          const dname = WEEKDAY_LONG[new Date(year, month, day).getDay()]
          let tip = `${dname}, ${day} ${MONTH_NAMES[month]} ${year}`
          if (isHoliday) tip += ` · Holiday: ${holidays.nameOf(iso) ?? 'Holiday'}`
          if (hasPlan) tip += ` · Availability ${pct}% (${executed}h/${planned}h) · ${met ? `goal met (≥${goal}%)` : `below goal (${goal}%)`}`
          else if (!isHoliday) tip += ' · Day off'

          const isSelected = selected === day
          return (
            <button
              key={i}
              type="button"
              title={tip}
              onClick={() => setSelected(day)}
              className={`relative grid h-9 place-items-center rounded-md ${
                isSelected ? 'ring-2 ring-inset ring-primary' : ''
              } ${
                isToday ? 'bg-primary font-semibold text-white' : isHoliday ? 'bg-[#fdf3e2] text-ink' : 'text-ink hover:bg-page'
              }`}
            >
              <span className={isHoliday && !isToday ? 'text-warning' : ''}>{day}</span>
              {dot && !isToday && (
                <span className={`absolute bottom-1 h-1 w-1 rounded-full ${dot}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* legend */}
      <div className="mt-2 flex items-center justify-center gap-3 border-t border-line pt-2 text-[0.625rem] text-muted">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Goal met</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-warning" /> Below</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#fdf3e2] ring-1 ring-warning/40" /> Holiday</span>
      </div>

      {/* quick-edit mini modal — writes to the shared plan, so Settings reflects it */}
      {selected != null && selIso && selDay && (
        <>
          <div className="absolute inset-0 z-10 rounded-xl bg-ink/10" onClick={() => setSelected(null)} />
          <div className="absolute inset-x-2 top-10 z-20 rounded-xl border border-line bg-white p-3 shadow-pop">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">{MONTH_NAMES[month]} {selected}, {year}</p>
                <p className="text-[0.6875rem] text-muted">
                  {selHoliday ? `Holiday: ${holidays.nameOf(selIso) ?? 'Holiday'}` : WEEKDAY_LONG[new Date(year, month, selected).getDay()]}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-page" aria-label="Close">✕</button>
            </div>

            {selHoliday && (
              <button
                type="button"
                onClick={() => wh.setWorking(selIso, !wh.set.has(selIso))}
                className="mb-3 flex w-full items-center justify-between rounded-lg bg-page px-3 py-2 text-xs font-medium text-ink"
              >
                Working day
                <span className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${wh.set.has(selIso) ? 'bg-primary' : 'bg-line'}`}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${wh.set.has(selIso) ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                </span>
              </button>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">Planned hours</span>
              <div className="flex items-center gap-1 rounded-lg border border-line">
                <button onClick={() => setDayHours(selIso, Math.max(0, Math.round((selDay.planned - 1) * 2) / 2))} className="grid h-7 w-7 place-items-center text-muted hover:text-ink" aria-label="Decrease">−</button>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={selDay.planned}
                  onChange={(e) => setDayHours(selIso, e.target.value === '' ? 0 : Number(e.target.value))}
                  className="no-spin w-10 bg-transparent text-center text-sm font-bold tabular-nums text-ink outline-none"
                />
                <button onClick={() => setDayHours(selIso, Math.round((selDay.planned + 1) * 2) / 2)} className="grid h-7 w-7 place-items-center text-muted hover:text-ink" aria-label="Increase">+</button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-xs">
              <span className="text-muted">Availability</span>
              <span className={`font-semibold ${selDay.planned > 0 && selDay.pct >= goal ? 'text-up' : selDay.planned > 0 ? 'text-warning' : 'text-faint'}`}>
                {selDay.planned > 0 ? `${Math.round(selDay.pct)}% · ${selDay.executed}h/${selDay.planned}h` : 'Day off'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface NotificationsProps {
  notifs: Notification[]
  onRead: (id: number) => void
  onReadAll: () => void
}

function Notifications({ notifs, onRead, onReadAll }: NotificationsProps) {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-sm font-semibold">Notifications</p>
        <button onClick={onReadAll} className="text-xs font-medium text-primary hover:underline">
          Mark all read
        </button>
      </div>
      <div className="max-h-80 overflow-auto">
        {notifs.map((n) => (
          <button
            key={n.id}
            onClick={() => onRead(n.id)}
            className="flex w-full items-start gap-2.5 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-page"
          >
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-primary'}`} />
            <span>
              <span className={`block text-sm ${n.read ? 'text-muted' : 'text-ink'}`}>{n.text}</span>
              <span className="text-[0.6875rem] text-faint">{n.time}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function AccountMenu() {
  const user = useSession()
  const [currentOrg, setCurrentOrg] = useLocalStorage('dr-current-org', 'NETZSCH Equipamentos de Moagem')
  const [orgModal, setOrgModal] = useState(false)

  // Demo organizations (one org = one company). The user's signup company is
  // appended when it isn't already in the list. Cosmetic only — no backend.
  const orgs = useMemo(() => {
    const base = [
      'NETZSCH Equipamentos de Moagem',
      'NETZSCH Análise & Teste',
      'NETZSCH Bombas & Sistemas',
    ]
    if (user.company.name && !base.includes(user.company.name)) base.push(user.company.name)
    return base
  }, [user.company.name])

  return (
    <div className="py-1">
      <div className="border-b border-line px-4 py-3">
        <p className="text-sm font-semibold text-ink">{user.name}</p>
        <p className="text-xs text-muted">{user.email}</p>
      </div>

      <div className="border-b border-line px-4 py-3">
        <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-muted">Organization</p>
        <p className="mt-1 text-sm font-medium text-ink">{currentOrg}</p>
        <button
          onClick={() => setOrgModal(true)}
          className="mt-1.5 text-xs font-medium text-primary hover:underline"
        >
          Switch organization
        </button>
      </div>

      <MenuItem label="Profile" onClick={() => {}} />
      <div className="my-1 border-t border-line" />
      <MenuItem label="Sign out" onClick={() => {}} danger />

      {orgModal && (
        <OrgSwitchModal
          orgs={orgs}
          current={currentOrg}
          onPick={(org) => {
            setCurrentOrg(org)
            setOrgModal(false)
          }}
          onClose={() => setOrgModal(false)}
        />
      )}
    </div>
  )
}

function OrgSwitchModal({
  orgs,
  current,
  onPick,
  onClose,
}: {
  orgs: string[]
  current: string
  onPick: (org: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl border border-line bg-white text-ink shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-semibold text-ink">Switch organization</p>
          <button onClick={onClose} className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-page" aria-label="Close">✕</button>
        </div>
        <div className="max-h-80 overflow-auto p-2">
          {orgs.map((org) => {
            const selected = org === current
            return (
              <button
                key={org}
                type="button"
                onClick={() => onPick(org)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm ${
                  selected ? 'bg-primary-soft/50 font-medium text-ink' : 'text-ink hover:bg-page'
                }`}
              >
                <span>{org}</span>
                {selected && <span className="text-base font-semibold text-primary">✓</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Other NETZSCH products reachable from the 9-dot launcher. Real URLs go in
// `href` (left as '#' placeholders until provided — those won't navigate).
interface Product {
  name: string
  desc: string
  href: string
  color: string
  glyph: ReactNode
  current?: boolean
  internal?: boolean // same-tab navigation (switches the app version)
}


const PRODUCTS: Product[] = [
  {
    name: 'Performance Tracking',
    desc: 'Batch reports & analytics',
    href: '#',
    color: '#46aa9f',
    current: true,
    glyph: BATCH_BOOK_GLYPH,
  },
  {
    name: 'Performance Tracking v0',
    desc: 'Registry only',
    href: '/batch-book?v=0',
    color: '#6ca8c9',
    internal: true,
    glyph: BATCH_BOOK_GLYPH,
  },
  {
    name: 'Performance Tracking v1',
    desc: 'Full access',
    href: '/batch-book?v=1',
    color: '#5b97b8',
    internal: true,
    glyph: BATCH_BOOK_GLYPH,
  },
  {
    name: 'Performance Tracking v2',
    desc: 'Material UI rebuild',
    href: '/batch-book-v2?v=2',
    color: '#008d84',
    internal: true,
    glyph: BATCH_BOOK_GLYPH,
  },
  {
    name: 'IRIS Cloud',
    desc: 'Digitalization Hub',
    href: 'http://iris-cloud.netzsch.com/',
    color: '#3b82f6',
    glyph: (
      <>
        <path d="M17.5 19a4.5 4.5 0 0 0 .5-8.96A6 6 0 0 0 6.3 9.5 4 4 0 0 0 7 19Z" />
      </>
    ),
  },
  {
    name: 'Production Monitoring',
    desc: 'Real time monitoring',
    href: 'http://pm.iris-cloud.netzsch.com/',
    color: '#f19909',
    glyph: (
      <>
        <path d="M3 12h4l2 6 4-14 2 8h4" />
      </>
    ),
  },
]

function ProductLauncher({ onPick }: { onPick: () => void }) {
  return (
    <div className="p-3">
      <p className="px-1 pb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
        NETZSCH products
      </p>
      <div className="grid grid-cols-2 gap-2">
        {PRODUCTS.map((p) => {
          const isPlaceholder = p.href === '#'
          return (
            <a
              key={p.name}
              href={p.href}
              target={p.internal || isPlaceholder ? undefined : '_blank'}
              rel="noreferrer"
              onClick={(e) => {
                if (isPlaceholder) e.preventDefault()
                onPick()
              }}
              className={`group relative flex flex-col items-start gap-2 rounded-xl border p-3 transition-colors ${
                p.current
                  ? 'border-primary/40 bg-primary-soft/50'
                  : 'border-line hover:border-primary hover:bg-page'
              }`}
            >
              <span
                className="grid h-9 w-9 place-items-center rounded-lg text-white"
                style={{ background: p.color }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  {p.glyph}
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-[0.8125rem] font-semibold leading-tight text-ink">{p.name}</span>
                <span className="mt-0.5 block text-[0.6875rem] leading-tight text-muted">{p.desc}</span>
              </span>
              {p.current && (
                <span className="absolute right-2 top-2 rounded-full bg-primary px-1.5 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-wide text-white">
                  Current
                </span>
              )}
            </a>
          )
        })}
      </div>
    </div>
  )
}

function MenuItem({ label, onClick, icon, danger }: { label: string; onClick: () => void; icon?: ReactNode; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-page ${
        danger ? 'text-down' : 'text-ink'
      }`}
    >
      {icon && <span className="text-muted">{icon}</span>}
      {label}
    </button>
  )
}
