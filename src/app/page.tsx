import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { AppShell } from '@/components/tax-system/app-shell'

// Server Component: checks auth, redirects to /login if not authenticated.
export default async function Home() {
  const user = await getSession()
  if (!user) {
    redirect('/login')
  }
  return <AppShell user={user} />
}
