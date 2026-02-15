import React from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import { Button } from '@/components/ui/Button'

export const Topbar = () => {
  const { user, logout } = useAuth()

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex-1">
        <h1 className="text-xl font-semibold text-gray-900">Faculty Skill Development Portal</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {user?.name} <span className="text-primary-600">({user?.role})</span>
        </span>
        <Button onClick={logout} variant="danger" size="sm">
          Logout
        </Button>
      </div>
    </div>
  )
}
