import React from 'react'
import { ChevronDown } from 'lucide-react'

const SelectContext = React.createContext()

const Select = ({ value, onValueChange, children, defaultValue }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedValue, setSelectedValue] = React.useState(defaultValue || value || '')
  const [displayText, setDisplayText] = React.useState('')
  
  const currentValue = value !== undefined ? value : selectedValue
  
  const handleValueChange = (newValue, text) => {
    if (value === undefined) {
      setSelectedValue(newValue)
    }
    setDisplayText(text)
    setIsOpen(false)
    if (onValueChange) {
      onValueChange(newValue)
    }
  }
  
  return (
    <SelectContext.Provider 
      value={{ 
        value: currentValue, 
        onValueChange: handleValueChange, 
        isOpen, 
        setIsOpen,
        displayText 
      }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef(({ className = '', children, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  
  return (
    <button
      ref={ref}
      type="button"
      className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={() => context.setIsOpen(!context.isOpen)}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
})
SelectTrigger.displayName = 'SelectTrigger'

const SelectValue = ({ placeholder = 'Select...' }) => {
  const context = React.useContext(SelectContext)
  return <span>{context.displayText || placeholder}</span>
}

const SelectContent = React.forwardRef(({ className = '', children, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  
  if (!context.isOpen) return null
  
  return (
    <div
      ref={ref}
      className={`absolute z-50 mt-1 max-h-96 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md ${className}`}
      {...props}
    >
      <div className="p-1">{children}</div>
    </div>
  )
})
SelectContent.displayName = 'SelectContent'

const SelectItem = React.forwardRef(({ className = '', value, children, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  const isSelected = context.value === value
  
  return (
    <div
      ref={ref}
      className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground ${
        isSelected ? 'bg-accent' : ''
      } ${className}`}
      onClick={() => context.onValueChange(value, children)}
      {...props}
    >
      {children}
    </div>
  )
})
SelectItem.displayName = 'SelectItem'

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }