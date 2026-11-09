import type { Meta, StoryObj } from '@storybook/react'
import AppHeader from './AppHeader'

const meta = {
  title: 'Layout/AppHeader',
  component: AppHeader,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The product top bar: NETZSCH 9-dot product launcher, app identity, and (when not restricted) a wired mini-calendar, notifications popover, and the account menu with organization switching. Reads the logged-in user from `useSession` (mocked in Storybook).',
      },
    },
  },
  args: {
    name: 'Performance Tracking',
    icon: null,
    restricted: false,
  },
} satisfies Meta<typeof AppHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Full: Story = {}

// v0 (restricted): calendar + notifications hidden.
export const Restricted: Story = {
  args: { restricted: true },
}
