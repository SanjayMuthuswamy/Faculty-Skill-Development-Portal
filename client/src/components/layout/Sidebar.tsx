import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'

export const Sidebar = () => {
  const { user } = useAuth()
  const location = useLocation()

  const adminMenuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
    { name: 'Users', path: '/admin/users', icon: '👥' },
    { name: 'Settings', path: '/admin/settings', icon: '⚙️' },
  ]

  const facultyMenuItems = [
    { name: 'Dashboard', path: '/faculty/dashboard', icon: '📊' },
    { name: 'My Courses', path: '/faculty/courses', icon: '📚' },
    { name: 'Profile', path: '/faculty/profile', icon: '👤' },
  ]

  const menuItems = user?.role === 'ADMIN' ? adminMenuItems : facultyMenuItems

  return (
    <div className="bg-gray-800 text-white w-64 min-h-screen p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">FSDP</h2>
      </div>
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              location.pathname === item.path
                ? 'bg-primary-600 text-white'
                : 'hover:bg-gray-700 text-gray-300'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
