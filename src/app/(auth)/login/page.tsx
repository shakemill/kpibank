'use client'

import { Suspense, useState } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { AlertCircle, Lock, Mail, ArrowRight, CheckCircle } from 'lucide-react'
import { useEtablissement } from '@/contexts/etablissement-context'

const loginSchema = z.object({
  email: z.string().min(1, 'L\'email est requis').email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
})

type LoginFormValues = z.infer<typeof loginSchema>

function LoginForm() {
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { nom: nomEtablissement } = useEtablissement()
  const timeout = searchParams.get('timeout')

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const isLoading = form.formState.isSubmitting

  const onSubmit = async (values: LoginFormValues) => {
    setError('')
    const result = await signIn('credentials', {
      email: values.email.trim().toLowerCase(),
      password: values.password,
      redirect: false,
    })
    if (result?.error) {
      if (result.error === 'Compte désactivé') {
        setError('Votre compte a été désactivé. Contactez l\'administrateur.')
      } else {
        setError('Email ou mot de passe incorrect.')
      }
      return
    }
    if (result?.ok) {
      // Laisser le navigateur enregistrer le cookie de session avant la redirection
      await new Promise((r) => setTimeout(r, 200))
      window.location.replace('/dashboard')
    }
  }

  return (
    <div className="flex min-h-screen" suppressHydrationWarning>
      {/* Left Side - Branding with Gradient */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#003369] via-[#22688e] to-[#003369]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#a4b28c] opacity-10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#d2e1ac] opacity-10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="w-[200px]">
            <Image
              src="/images/bgfi-bank-logo.png"
              alt={nomEtablissement}
              width={200}
              height={80}
              className="w-full h-auto"
              priority
            />
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-4xl font-bold leading-tight">
                Système KPI
                <br />
                {nomEtablissement}
              </h2>
              <p className="text-lg text-white/80 max-w-md">
                Suivez et mesurez vos indicateurs en temps réel pour atteindre vos objectifs.
              </p>
            </div>
            <div className="space-y-4 pt-8">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-[#a4b28c] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Suivi des KPI en continu</p>
                  <p className="text-sm text-white/70">Visualisez vos indicateurs instantanément</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-[#a4b28c] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Objectifs personnalisés</p>
                  <p className="text-sm text-white/70">Objectifs individuels et d&apos;équipe</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-[#a4b28c] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Évaluations continues</p>
                  <p className="text-sm text-white/70">Feedback régulier et structuré</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-white p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-8">
            <div className="mx-auto mb-4 w-[180px]">
              <Image
                src="/images/bgfi-bank-logo.png"
                alt={nomEtablissement}
                width={180}
                height={80}
                className="w-full h-auto"
                priority
              />
            </div>
            <p className="text-sm text-gray-600">Système KPI — {nomEtablissement}</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">Connexion</h2>
            <p className="text-gray-600">Accédez à votre espace de travail</p>
          </div>

          {timeout && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Votre session a expiré. Veuillez vous reconnecter.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Adresse email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          type="email"
                          placeholder="votre.email@banque.com"
                          disabled={isLoading}
                          className="pl-10 h-12 border-gray-300 focus:border-[#003369] focus:ring-[#003369] bg-white"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          disabled={isLoading}
                          className="pl-10 h-12 border-gray-300 focus:border-[#003369] focus:ring-[#003369] bg-white"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-[#003369] to-[#22688e] hover:from-[#22688e] hover:to-[#003369] text-white font-medium transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <p className="text-center text-xs text-gray-500">
            © 2025 Système KPI — {nomEtablissement}. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
