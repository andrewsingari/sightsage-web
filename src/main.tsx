// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createBrowserRouter, Link, useRouteError, isRouteErrorResponse } from 'react-router-dom'
import './index.css'
import App from './App'
import Home from './pages/Home'
import Products from './pages/Products'
import Education from './pages/Education'
import Login from './pages/Login'
import Register from './pages/Register'
import HealthReport from './pages/HealthReport'
import Questionnaire from './pages/Questionnaire'
import VisionWellness from './pages/VisionWellness'
import TestSupabase from './pages/TestSupabase'
import Profile from './pages/Profile'

function RootError() {
  const error = useRouteError() as any
  const status = isRouteErrorResponse(error) ? error.status : 404
  const statusText = isRouteErrorResponse(error) ? error.statusText : 'Not Found'
  return (
    <div className="max-w-3xl mx-auto text-center py-24">
      <h1 className="text-3xl font-extrabold text-gray-900">{status} {statusText}</h1>
      <p className="mt-2 text-gray-600">We couldn’t find that page.</p>
      <Link to="/" className="inline-block mt-6 px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50">Go Home</Link>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <RootError />,
    children: [
      { index: true, element: <Home /> },
      { path: 'products', element: <Products /> },
      { path: 'education', element: <Education /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'healthreport', element: <HealthReport /> },
      { path: 'questionnaire/:topic', element: <Questionnaire /> },
      { path: 'vision-wellness', element: <VisionWellness /> },
      { path: 'test-supabase', element: <TestSupabase /> },
      { path: 'profile', element: <Profile /> }
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)