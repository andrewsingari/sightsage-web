
import React from 'react'
export default function Card({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={['bg-white border rounded-2xl p-4', className].join(' ')}>{children}</div>
}
