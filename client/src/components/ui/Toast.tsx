import React, { useState } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export const Toast = ({ message, type = 'info' }: { message: string; type?: 'success' | 'error' | 'info' }) => {
  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }

  return (
    <div className={`${bgColor[type]} text-white px-4 py-3 rounded-lg shadow-lg`}>{message}</div>
  )
}
