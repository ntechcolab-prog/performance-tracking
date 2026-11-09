import type { Meta, StoryObj } from '@storybook/react'

// Digital Reports / Performance Tracking design tokens (from app/globals.css @theme).
// Painted with literal hex so the swatches never depend on a Tailwind utility
// being generated for a given token.
const GROUPS: { title: string; tokens: { name: string; value: string; ink?: boolean }[] }[] = [
  {
    title: 'Surfaces',
    tokens: [
      { name: 'header', value: '#4c4d57' },
      { name: 'sidebar', value: '#5c5f62' },
      { name: 'page', value: '#f6f6f6', ink: true },
      { name: 'card', value: '#ffffff', ink: true },
    ],
  },
  {
    title: 'Brand',
    tokens: [
      { name: 'primary', value: '#46aa9f' },
      { name: 'primary-700', value: '#008d84' },
      { name: 'primary-soft', value: '#e2f0ed', ink: true },
    ],
  },
  {
    title: 'Text',
    tokens: [
      { name: 'ink', value: '#4c4d57' },
      { name: 'muted', value: '#8d9094' },
      { name: 'faint', value: '#c3c5c7', ink: true },
      { name: 'line', value: '#ececec', ink: true },
    ],
  },
  {
    title: 'Status',
    tokens: [
      { name: 'up', value: '#1aa367' },
      { name: 'down', value: '#c12907' },
      { name: 'warning', value: '#f19909' },
    ],
  },
  {
    title: 'Chart palette',
    tokens: [
      { name: 'chart-1', value: '#46aa9f' },
      { name: 'chart-2', value: '#6bb7b0' },
      { name: 'chart-3', value: '#f19909' },
      { name: 'chart-4', value: '#f89984' },
      { name: 'chart-5', value: '#a2a6ac' },
    ],
  },
]

function Palette() {
  return (
    <div className="space-y-6">
      {GROUPS.map((g) => (
        <section key={g.title}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.title}</h3>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(9rem, 1fr))' }}>
            {g.tokens.map((t) => (
              <div key={t.name} className="overflow-hidden rounded-xl border border-line/70 shadow-card">
                <div className="h-16" style={{ background: t.value, color: t.ink ? '#4c4d57' : '#fff' }} />
                <div className="bg-card px-3 py-2">
                  <p className="text-xs font-semibold text-ink">{t.name}</p>
                  <p className="text-[0.6875rem] tabular-nums text-muted">{t.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

const meta = {
  title: 'Foundations/Colors',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The Performance Tracking color tokens defined in `app/globals.css` (@theme) — surfaces, brand teal, text, status, and the chart palette.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

export const Tokens: Story = {
  render: () => <Palette />,
}
