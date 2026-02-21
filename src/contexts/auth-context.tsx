'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastActivity, setLastActivity] = useState(Date.now())
  const router = useRouter()

  // Inactivity timeout: 15 minutes
  const INACTIVITY_TIMEOUT = 15 * 60 * 1000

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!user) return

    // Update last activity on user interaction
    const updateActivity = () => {
      setLastActivity(Date.now())
    }

    // Listen to user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((event) => {
      window.addEventListener(event, updateActivity)
    })

    // Check for inactivity every minute
    const interval = setInterval(() => {
      const now = Date.now()
      if (now - lastActivity > INACTIVITY_TIMEOUT) {
        setUser(null)
        localStorage.removeItem('user')
        router.push('/login?timeout=true')
      }
    }, 60000)

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity)
      })
      clearInterval(interval)
    }
  }, [user, lastActivity, router])

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock authentication - replace with real API call
    if (email && password.length >= 6) {
      const userData: User = {
        id: '1',
        email,
        name: email.split('@')[0],
        role: 'admin',
      }
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
