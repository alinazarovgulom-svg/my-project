import { useState, useEffect } from 'react'

const formatNum = (val) => {
  const digits = String(val).replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const rawNum = (val) => String(val).replace(/\s/g, '')

export default function AmountInput({ value, onChange, placeholder = '0', className = '', ...props }) {
  const [display, setDisplay] = useState(formatNum(value))

  useEffect(() => {
    if (rawNum(value) !== rawNum(display)) {
      setDisplay(formatNum(value))
    }
  }, [value])

  const handleChange = (e) => {
    const raw = rawNum(e.target.value)
    if (raw && isNaN(Number(raw))) return
    setDisplay(formatNum(raw))
    onChange(raw)
  }

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  )
}
