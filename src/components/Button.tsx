
import React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }
export default function Button({ variant = 'primary', className = '', ...rest }: Props) {
  const base = 'px-4 py-2 rounded-xl font-bold'
  const styles = variant === 'primary'
    ? 'bg-[var(--brand)] text-white'
    : 'border hover:bg-gray-50'
  return <button {...rest} className={[base, styles, className].join(' ')} />
}
