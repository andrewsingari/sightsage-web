
import React from 'react'
import Button from '@/components/Button'

export default function Products() {
  return (
    <div className="grid place-items-center h-80">
      <div className="text-lg">Products</div>
      <Button className="mt-4" onClick={() => history.back()}>Back</Button>
    </div>
  )
}
