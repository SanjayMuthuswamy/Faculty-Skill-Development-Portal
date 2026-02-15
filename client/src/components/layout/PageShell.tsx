import React from 'react'
import { Topbar } from './Topbar'
import { Sidebar } from './Sidebar'

interface PageShellProps {
  children: React.ReactNode
}

export const PageShell = ({ children }: PageShellProps) => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
