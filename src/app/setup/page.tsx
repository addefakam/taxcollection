'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Building2, Loader2, CheckCircle2, AlertCircle, Database, Copy, KeyRound } from 'lucide-react'

interface SetupResponse {
  ok: boolean
  alreadyInitialized: boolean
  created?: { woredas: number; staff: number; taxPayers: number; taxTargets: number }
  leaderCredentials?: { email: string; password: string }
  message?: string
  error?: string
  hint?: string
}

export default function SetupPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SetupResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const runSetup = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/setup', { method: 'POST' })
      const data: SetupResponse = await res.json()
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const checkStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/setup')
      const data = await res.json()
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const copyCredentials = () => {
    if (result?.leaderCredentials) {
      navigator.clipboard.writeText(
        `Email: ${result.leaderCredentials.email}\nPassword: ${result.leaderCredentials.password}`
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-emerald-50/40 px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg mb-3">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Database Setup</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Initialize your Neon PostgreSQL database with tables and the Leader account
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Database Initialization
            </CardTitle>
            <CardDescription>
              If this is your first deployment and you can&apos;t log in, run the setup below.
              It creates the necessary tables (via the Vercel build step) and seeds the
              Leader account, sample woredas, and yearly tax targets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={runSetup} disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Setting up…
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" /> Initialize Database
                  </>
                )}
              </Button>
              <Button onClick={checkStatus} variant="outline" disabled={loading} className="gap-2">
                Check Status
              </Button>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="space-y-3">
                {result.ok && !result.alreadyInitialized && (
                  <div className="rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-5 w-5" />
                      <p className="font-medium">Database initialized successfully!</p>
                    </div>
                    {result.created && (
                      <div className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
                        <p>Created:</p>
                        <ul className="list-disc list-inside ml-2">
                          <li>{result.created.woredas} woredas (sub-cities)</li>
                          <li>{result.created.staff} staff accounts</li>
                          <li>{result.created.taxTargets} yearly tax targets</li>
                        </ul>
                      </div>
                    )}
                    {result.leaderCredentials && (
                      <div className="rounded-md bg-background p-3 border border-emerald-200 dark:border-emerald-800">
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-1">
                          <KeyRound className="h-3 w-3" />
                          Leader Login Credentials:
                        </p>
                        <div className="font-mono text-sm space-y-1">
                          <p>
                            <span className="text-muted-foreground">Email:</span>{' '}
                            {result.leaderCredentials.email}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Password:</span>{' '}
                            {result.leaderCredentials.password}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 gap-1.5"
                          onClick={copyCredentials}
                        >
                          <Copy className="h-3 w-3" />
                          {copied ? 'Copied!' : 'Copy credentials'}
                        </Button>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                          ⚠️ Change this password after first login (User menu → Change password).
                        </p>
                      </div>
                    )}
                    <Button className="w-full" onClick={() => (window.location.href = '/login')}>
                      Go to Login →
                    </Button>
                  </div>
                )}

                {result.ok && result.alreadyInitialized && (
                  <div className="rounded-md border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 p-4">
                    <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
                      <CheckCircle2 className="h-5 w-5" />
                      <p className="font-medium">Database is already initialized</p>
                    </div>
                    <p className="text-sm text-sky-700 dark:text-sky-300 mt-1">
                      You can log in now with your Leader account.
                    </p>
                    <Button className="w-full mt-3" onClick={() => (window.location.href = '/login')}>
                      Go to Login →
                    </Button>
                  </div>
                )}

                {!result.ok && result.message && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      <p className="font-medium">Setup Failed</p>
                    </div>
                    <p className="text-sm">{result.message}</p>
                    {result.error && (
                      <p className="text-xs text-muted-foreground font-mono">{result.error}</p>
                    )}
                    {result.hint && (
                      <div className="rounded-md bg-background p-3 border text-xs">
                        <p className="font-medium">Hint:</p>
                        <p className="mt-1 text-muted-foreground">{result.hint}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Status-only response (from GET) */}
                {result.ok === undefined && result.message && (
                  <div className="rounded-md border border-border bg-muted/40 p-4">
                    <p className="text-sm">{result.message}</p>
                    {result.initialized && (
                      <Button
                        className="w-full mt-3"
                        onClick={() => (window.location.href = '/login')}
                      >
                        Go to Login →
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">How this works:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  The Vercel build step runs <code className="font-mono">prisma db push</code>{' '}
                  automatically (via the <code className="font-mono">prebuild</code> script in
                  package.json). This creates all tables in your Neon database.
                </li>
                <li>
                  Click <strong>Initialize Database</strong> above to seed the Leader account,
                  sample woredas, and yearly tax targets.
                </li>
                <li>
                  Once initialized, go to <code className="font-mono">/login</code> and sign in
                  with the Leader credentials shown.
                </li>
              </ol>
              <p className="pt-2 border-t mt-2">
                If tables are still missing after deployment, run locally:{' '}
                <code className="font-mono">
                  DATABASE_URL=your_neon_url npx prisma db push
                </code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
