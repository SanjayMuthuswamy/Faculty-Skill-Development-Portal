import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/app/providers/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

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
      // Navigation will happen based on role
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async (role: 'admin' | 'faculty') => {
    const credentials = {
      admin: { email: 'admin@fsdp.com', password: 'Admin@123' },
      faculty: { email: 'faculty@fsdp.com', password: 'Faculty@123' },
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">FSDP</h1>
          <p className="text-gray-600">Faculty Skill Development Portal</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6">
          <Input
            label="Email"
            type="email"
            placeholder="admin@fsdp.com"
            {...register('email')}
            error={errors.email?.message}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            {...register('password')}
            error={errors.password?.message}
          />

          <Button type="submit" isLoading={isLoading} className="w-full">
            Login
          </Button>
        </form>

        <div className="border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-600 mb-4 text-center">Demo Accounts</p>
          <div className="space-y-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleDemoLogin('admin')}
              disabled={isLoading}
              className="w-full"
            >
              Demo: Admin
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleDemoLogin('faculty')}
              disabled={isLoading}
              className="w-full"
            >
              Demo: Faculty
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default LoginPage
