'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/src/ds/components/Skeleton'

// CKEditor touches window on import, so it is only loaded in the browser.
const RichTextField = dynamic(() => import('./RichTextEditor'), {
  ssr: false,
  loading: () => <Skeleton height={140} className="w-full rounded-card" />,
})

export default RichTextField

/** Plain text of a rich-text value (for exports and summaries). */
export function richTextToPlain(html: string): string {
  return html
    .replace(/<\/(p|h[1-6]|li|blockquote|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{2,}/g, '\n')
    .trim()
}
