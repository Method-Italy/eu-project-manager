import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProjectView from './pages/ProjectView'
import './App.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard session={session} />} />
        <Route path="/project/:id" element={<ProjectView session={session} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
