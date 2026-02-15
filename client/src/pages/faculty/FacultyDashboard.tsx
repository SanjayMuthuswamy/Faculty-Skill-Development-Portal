import React from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/app/providers/AuthProvider'

const FacultyDashboard = () => {
  const { user } = useAuth()

  return (
    <PageShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Faculty Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <h3 className="text-lg font-semibold mb-2">My Courses</h3>
            <p className="text-4xl font-bold">0</p>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <h3 className="text-lg font-semibold mb-2">Students Enrolled</h3>
            <p className="text-4xl font-bold">0</p>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <h3 className="text-lg font-semibold mb-2">Pending Tasks</h3>
            <p className="text-4xl font-bold">0</p>
          </Card>
        </div>

        <Card>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <h3 className="font-semibold text-gray-900">Create New Course</h3>
              <p className="text-sm text-gray-600 mt-1">Setup and launch a new course</p>
            </button>
            <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <h3 className="font-semibold text-gray-900">View Enrollments</h3>
              <p className="text-sm text-gray-600 mt-1">Manage student enrollments</p>
            </button>
            <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <h3 className="font-semibold text-gray-900">Grade Students</h3>
              <p className="text-sm text-gray-600 mt-1">Review and grade assignments</p>
            </button>
            <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <h3 className="font-semibold text-gray-900">My Profile</h3>
              <p className="text-sm text-gray-600 mt-1">Edit profile and settings</p>
            </button>
          </div>
        </Card>
      </div>
    </PageShell>
  )
}

export default FacultyDashboard
