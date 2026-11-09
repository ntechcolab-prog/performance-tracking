#!/usr/bin/env node
// Static build of the v2 mock app for MIRA (Techco.lab prototype review).
// Run by mira-publish.mjs (see mira.json), which sets BASE_PATH.
//
// The real app needs a server (middleware, /api, the Neon-backed layout, the
// IRIS login), so this copies the repo to .mira-build/, keeps only the v2 demo
// with the in-memory DEMO_USER layout, mounts its route tree at the root (so
// MIRA gets /, /registry, /registry/<id>/<tab>, … — see src/v2/routes.ts, one
// HTML each) and exports it. The working tree and the normal Vercel deploy are
// never touched.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const root = process.cwd()
const work = path.join(root, '.mira-build')
const SKIP = new Set(['node_modules', '.next', 'out', '.git', '.mira-build', '.vercel', 'storybook-static'])

rmSync(work, { recursive: true, force: true })
mkdirSync(work)
for (const entry of readdirSync(root)) {
  if (!SKIP.has(entry)) cpSync(path.join(root, entry), path.join(work, entry), { recursive: true })
}
symlinkSync(path.join(root, 'node_modules'), path.join(work, 'node_modules'), 'dir')

// Server-only pieces and every route outside the v2 demo.
const drop = ['middleware.ts', 'app/api', 'app/(app)/admin', 'app/(app)/batch-book', 'app/login', 'app/signup']
for (const d of readdirSync(path.join(work, 'app'))) if (d.startsWith('iris-')) drop.push(`app/${d}`)
for (const d of drop) rmSync(path.join(work, d), { recursive: true, force: true })

// Files in public/ are referenced from the site root; under MIRA they live
// below BASE_PATH (next/image and <Link> handle that themselves, raw src= does not).
const base = process.env.BASE_PATH ?? ''
// Reviewed inside IRIS Cloud as Performance Tracking: tab title and icon follow the IRIS Cloud mark,
// not the Performance Tracking one (which stays on the real deploy).
const layoutFile = path.join(work, 'app/layout.tsx')
writeFileSync(layoutFile, readFileSync(layoutFile, 'utf8')
  .replace(/title: '[^']*'/, "title: 'Performance Tracking · IRIS Cloud'")
  .replace(/icons: \{[^}]*\}/, "icons: { icon: '/iris-mark.svg' }"))

for (const f of ['app/layout.tsx', 'src/shared/client/iris/IrisLogo.tsx']) {
  const file = path.join(work, f)
  writeFileSync(file, readFileSync(file, 'utf8').replace(/(["'])\/(favicon\.svg|apple-touch-icon\.png|runtime-config\.js|iris-logo\.png|iris-mark\.svg)\1/g, `$1${base}/$2$1`))
}

writeFileSync(path.join(work, 'app/(app)/layout.tsx'), `'use client'
import { DEMO_USER, SessionProvider } from '@/src/shared/client/Session'
import { CompanyStateProvider } from '@/src/shared/client/CompanyState'

// MIRA build: public demo, in-memory state only (no Neon, no login).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider user={DEMO_USER}>
      <CompanyStateProvider initial={{}}>{children}</CompanyStateProvider>
    </SessionProvider>
  )
}
`)
// The v2 route tree (app/(app)/batch-book-v2/[[...path]]) moves to the root of
// the build, in place of the IRIS login page. The route file stays the single
// source — only its mount point changes, from root="/batch-book-v2" to root="".
rmSync(path.join(work, 'app/page.tsx'))
const routeDir = 'app/(app)/batch-book-v2/[[...path]]'
cpSync(path.join(work, routeDir), path.join(work, 'app/(app)/[[...path]]'), { recursive: true })
rmSync(path.join(work, 'app/(app)/batch-book-v2'), { recursive: true, force: true })
const pageFile = path.join(work, 'app/(app)/[[...path]]/page.tsx')
const page = readFileSync(pageFile, 'utf8')
if (!page.includes('root="/batch-book-v2"')) throw new Error(`${routeDir}/page.tsx: expected root="/batch-book-v2"`)
writeFileSync(pageFile, page.replace('root="/batch-book-v2"', 'root=""'))

writeFileSync(path.join(work, 'next.config.mjs'), `/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  output: 'export',
  basePath: process.env.BASE_PATH ?? '',
  images: { unoptimized: true },
  trailingSlash: true,
}
`)

const r = spawnSync('npx', ['next', 'build'], { cwd: work, stdio: 'inherit', env: process.env })
if (r.status !== 0) process.exit(r.status ?? 1)

rmSync(path.join(root, 'out'), { recursive: true, force: true })
cpSync(path.join(work, 'out'), path.join(root, 'out'), { recursive: true })
rmSync(work, { recursive: true, force: true })
if (!existsSync(path.join(root, 'out/index.html'))) process.exit(1)
console.log('MIRA build ready in out/')
