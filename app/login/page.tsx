'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, CheckCircle } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const router = useRouter()
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)
        setLoading(true)

        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) {
                    setError(error.message)
                    setLoading(false)
                    return
                }
                router.push('/dashboard/leads')
                router.refresh()
            } else {
                // Get the base URL for redirect
                const baseUrl = window.location.origin

                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${baseUrl}/auth/callback`,
                    }
                })
                if (error) {
                    setError(error.message)
                    setLoading(false)
                    return
                }
                // Show success message for email confirmation
                setSuccess(`Confirmation email sent to ${email}. Please check your inbox (and spam/junk folder) and click the link to verify your account.`)
                setLoading(false)
            }
        } catch (err) {
            setError('An unexpected error occurred')
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-[380px]">
                <CardHeader>
                    <CardTitle>Konnet</CardTitle>
                    <CardDescription>
                        {mode === 'login' ? 'Login to your account' : 'Create a new account'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                    <Mail className="w-6 h-6 text-green-600" />
                                </div>
                                <h3 className="font-semibold text-lg text-gray-900 mb-2">Check your email</h3>
                                <p className="text-sm text-gray-600">{success}</p>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    setSuccess(null)
                                    setMode('login')
                                }}
                            >
                                Back to Login
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="flex flex-col space-y-2 pt-2">
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={loading}
                                    onClick={() => setMode('login')}
                                >
                                    {loading && mode === 'login' ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Logging in...</>
                                    ) : (
                                        'Log in'
                                    )}
                                </Button>
                                <Button
                                    type="submit"
                                    variant="outline"
                                    className="w-full"
                                    disabled={loading}
                                    onClick={() => setMode('signup')}
                                >
                                    {loading && mode === 'signup' ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing up...</>
                                    ) : (
                                        'Sign up'
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
