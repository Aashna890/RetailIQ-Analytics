import React from 'react'
import { Menu } from 'lucide-react'

const SidebarContext = React.createContext({
  isOpen: true,
  setIsOpen: () => {}
})

const SidebarProvider = ({ children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  
  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  )
}

const Sidebar = React.forwardRef(({ className = '', children, ...props }, ref) => {
  const { isOpen } = React.useContext(SidebarContext)
  
  return (
    <aside
      ref={ref}
      className={`${isOpen ? 'w-64' : 'w-0 md:w-64'} transition-all duration-300 ${className}`}
      {...props}
    >
      <div className={`h-full ${isOpen ? 'block' : 'hidden md:block'}`}>
        {children}
      </div>
    </aside>
  )
})
Sidebar.displayName = 'Sidebar'

const SidebarHeader = React.forwardRef(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`px-3 py-2 ${className}`} {...props} />
))
SidebarHeader.displayName = 'SidebarHeader'

const SidebarContent = React.forwardRef(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`flex-1 overflow-auto py-2 ${className}`} {...props} />
))
SidebarContent.displayName = 'SidebarContent'

const SidebarFooter = React.forwardRef(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`px-3 py-2 ${className}`} {...props} />
))
SidebarFooter.displayName = 'SidebarFooter'

const SidebarGroup = React.forwardRef(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`px-3 py-2 ${className}`} {...props} />
))
SidebarGroup.displayName = 'SidebarGroup'

const SidebarGroupLabel = React.forwardRef(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`px-2 text-xs font-semibold text-muted-foreground ${className}`}
    {...props}
  />
))
SidebarGroupLabel.displayName = 'SidebarGroupLabel'

const SidebarGroupContent = React.forwardRef(({ className = '', ...props }, ref) => (
  <div ref={ref} className={className} {...props} />
))
SidebarGroupContent.displayName = 'SidebarGroupContent'

const SidebarMenu = React.forwardRef(({ className = '', ...props }, ref) => (
  <ul ref={ref} className={`space-y-1 ${className}`} {...props} />
))
SidebarMenu.displayName = 'SidebarMenu'

const SidebarMenuItem = React.forwardRef(({ className = '', ...props }, ref) => (
  <li ref={ref} className={className} {...props} />
))
SidebarMenuItem.displayName = 'SidebarMenuItem'

const SidebarMenuButton = React.forwardRef(({ className = '', asChild = false, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref,
      className: `flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground ${className}`,
      ...props
    })
  }
  
  return (
    <button
      ref={ref}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})
SidebarMenuButton.displayName = 'SidebarMenuButton'

const SidebarTrigger = ({ className = '' }) => {
  const { setIsOpen } = React.useContext(SidebarContext)
  
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      onClick={() => setIsOpen(prev => !prev)}
    >
      <Menu className="h-5 w-5" />
    </button>
  )
}

export {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
}