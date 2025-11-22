import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils/index";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  Network,
  Target,
  Upload,
  ChevronRight
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Data Import",
    url: createPageUrl("DataImport"),
    icon: Upload,
    color: "text-pink-600"
  },
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
    color: "text-indigo-600"
  },
  {
    title: "Customer Segments",
    url: createPageUrl("Customers"),
    icon: Users,
    color: "text-purple-600"
  },
  {
    title: "Sales Forecast",
    url: createPageUrl("SalesForecast"),
    icon: TrendingUp,
    color: "text-emerald-600"
  },
  {
    title: "Recommendations",
    url: createPageUrl("Recommendations"),
    icon: Target,
    color: "text-blue-600"
  },
  {
    title: "Market Basket",
    url: createPageUrl("MarketBasket"),
    icon: ShoppingBag,
    color: "text-amber-600"
  },
  {
    title: "Anomaly Detection",
    url: createPageUrl("Anomalies"),
    icon: AlertTriangle,
    color: "text-rose-600"
  }
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --primary: 239 84% 67%;
          --primary-foreground: 0 0% 100%;
          --secondary: 262 83% 58%;
          --accent: 160 84% 39%;
        }
      `}</style>
      
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <Sidebar className="border-r border-slate-200/60 bg-white/80 backdrop-blur-xl">
          <SidebarHeader className="border-b border-slate-200/60 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Network className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 tracking-tight">RetailIQ</h2>
                <p className="text-xs text-slate-500 font-medium">Smart Analytics</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`group relative mb-1 rounded-xl transition-all duration-200 ${
                            isActive 
                              ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-sm' 
                              : 'hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                            <item.icon className={`w-4 h-4 ${isActive ? item.color : 'text-slate-400'}`} />
                            <span className="font-medium text-sm">{item.title}</span>
                            {isActive && (
                              <ChevronRight className="w-4 h-4 ml-auto text-indigo-600" />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200/60 p-4">
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                <span className="text-slate-700 font-semibold text-sm">A</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">Analytics Admin</p>
                <p className="text-xs text-slate-500 truncate">admin@retailiq.com</p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 md:hidden sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                RetailIQ
              </h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}