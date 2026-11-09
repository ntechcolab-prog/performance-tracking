import { redirect } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/src/shared/server/db'
import { users, companies } from '@/src/shared/server/db/schema'
import { getCurrentUser } from '@/src/shared/server/auth'
import { IrisTopBar } from '@/src/shared/client/iris/IrisTopBar'

function fmt(d: Date | null): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

export default async function AdminPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')
  if (!me.isAdmin) redirect('/')

  const rows = await db
    .select({
      name: users.name,
      email: users.email,
      company: companies.name,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .innerJoin(companies, eq(users.companyId, companies.id))
    .orderBy(desc(users.createdAt))

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <IrisTopBar />
      <div className="px-10 py-10">
        <h1 className="text-2xl font-bold text-[#33333a]">Registered users</h1>
        <p className="mt-1 text-[#6b6b73]">
          {rows.length} {rows.length === 1 ? 'account' : 'accounts'} testing Performance Tracking
        </p>

        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f6f6f6] text-[0.75rem] uppercase tracking-wide text-[#8d9094]">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Registered</th>
                <th className="px-5 py-3 font-medium">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ececec] text-[#4c4d57]">
              {rows.map((r) => (
                <tr key={r.email} className="hover:bg-[#fafafa]">
                  <td className="px-5 py-3">
                    {r.name}
                    {r.isAdmin && (
                      <span className="ml-2 rounded bg-[#6ca8c9]/15 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase text-[#5b97b8]">
                        admin
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">{r.company}</td>
                  <td className="px-5 py-3 text-[#5c5f62]">{r.email}</td>
                  <td className="px-5 py-3 text-[#5c5f62]">{fmt(r.createdAt)}</td>
                  <td className="px-5 py-3 text-[#5c5f62]">{fmt(r.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
