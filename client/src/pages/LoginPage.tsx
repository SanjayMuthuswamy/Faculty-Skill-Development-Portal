import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/app/providers/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BrainCircuit, GraduationCap, ShieldCheck, Sparkles, ArrowRight, User as UserIcon, Lock, Eye, EyeOff } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().optional().default(''),
})

type LoginFormData = z.infer<typeof loginSchema>

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setError('')
    setIsLoading(true)

    try {
      await login(data.email, data.password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async (role: 'admin' | 'faculty') => {
    const credentials = {
      admin: { email: 'ms@gami.com', password: 'ms' },
      faculty: { email: 'sanjay@mail.com', password: '123' },
    }

    const { email, password } = credentials[role]
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans selection:bg-blue-100">
      {/* Left Side: Brand Image/Content */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-16 overflow-hidden bg-white border-r border-slate-100">
        {/* Subtle Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.05),transparent)]" />
        <div className="absolute bottom-0 right-0 w-full h-full -z-10 bg-[radial-gradient(circle_at_bottom_left,rgba(79,70,229,0.03),transparent)]" />

        <div className="animate-fade-in">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900 uppercase">FSD.Portal</span>
          </div>

          <h1 className="text-6xl font-extrabold text-slate-900 leading-[1.15] mb-8 tracking-tight">
            Empowering <br />
            <span className="text-blue-600">Modern Educators</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-lg font-medium leading-relaxed mb-12">
            The professional AI-driven skill development ecosystem.
            Design your roadmap, verify mastery, and excel in pedagogy.
          </p>
        </div>

        <div className="space-y-8 animate-slide-up">
          <div className="flex gap-4">
            <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-blue-50 flex items-center justify-center">
              <BrainCircuit className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-slate-900 font-bold text-lg mb-1">Adaptive Roadmaps</h3>
              <p className="text-slate-500 font-medium leading-relaxed">Dynamic AI algorithms tailor your growth journey to your goals.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-slate-900 font-bold text-lg mb-1">Pedagogical Mastery</h3>
              <p className="text-slate-500 font-medium leading-relaxed">Verified progress through standardized testing and skill audits.</p>
            </div>
          </div>
        </div>

        <div className="text-slate-400 text-sm font-semibold flex items-center gap-6 animate-fade-in">
          <span>&copy; 2026 FSD.Portal Tech</span>
          <div className="h-1 w-1 rounded-full bg-slate-200" />
          <span className="cursor-pointer hover:text-slate-600 transition-colors">Documentation</span>
          <div className="h-1 w-1 rounded-full bg-slate-200" />
          <span className="cursor-pointer hover:text-slate-600 transition-colors">Support</span>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-slate-50">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-10">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 uppercase">FSDP</span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Portal Access</h2>
            <p className="text-slate-500 font-medium text-lg">Sign in to your professional workspace</p>
          </div>

          {error && (
            <div className="mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold flex items-center gap-3 animate-fade-in shadow-sm">
              <div className="h-2 w-2 rounded-full bg-rose-500" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mb-10">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 px-1 mb-1">
                <UserIcon className="h-4 w-4 text-slate-400" />
                <label className="text-sm font-bold text-slate-700">Email Address</label>
              </div>
              <Input
                type="email"
                placeholder="faculty@example.com"
                {...register('email')}
                error={errors.email?.message}
                className="rounded-2xl border-slate-200 px-5 focus:border-blue-500 h-14"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1 px-1">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <label className="text-sm font-bold text-slate-700">Password</label>
                </div>
                <button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">Reset Password</button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  error={errors.password?.message}
                  className="rounded-2xl border-slate-200 px-5 focus:border-blue-500 h-14 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full h-14 rounded-2xl text-base font-bold group bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all">
              Launch Workspace
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </form>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-50 px-4 text-slate-400 font-bold tracking-widest">Single-Click Access</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDemoLogin('admin')}
              disabled={isLoading}
              className="h-14 rounded-2xl border-slate-200 hover:border-blue-600 hover:bg-white text-slate-600 hover:text-blue-600 font-bold shadow-sm active:scale-[0.98]"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Admin
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDemoLogin('faculty')}
              disabled={isLoading}
              className="h-14 rounded-2xl border-slate-200 hover:border-blue-600 hover:bg-white text-slate-600 hover:text-blue-600 font-bold shadow-sm active:scale-[0.98]"
            >
              <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
              Faculty
            </Button>
          </div>

          <p className="mt-10 text-center text-slate-500 text-sm font-medium">
            New to the portal? <button type="button" className="text-blue-600 font-bold hover:underline">Get System Access</button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
