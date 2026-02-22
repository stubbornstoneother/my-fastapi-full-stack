import { Bot, BookOpen, Building2, Home, ScrollText, Users, UserCog, Terminal } from "lucide-react"

import { SidebarAppearance } from "@/components/Common/Appearance"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { type Item, Main } from "./Main"
import { User } from "./User"

const baseItems: Item[] = [
  { icon: Home, title: "控制中心", path: "/" },
  { icon: Bot, title: "装备管理", path: "/robots" },
  { icon: Users, title: "人员档案", path: "/persons" },
  { icon: Building2, title: "部队架构", path: "/organizations" },
  { icon: BookOpen, title: "系统字典", path: "/dictionaries" },
  { icon: ScrollText, title: "系统日志", path: "/logs" },
]

export function AppSidebar() {
  const { user: currentUser } = useAuth()

  const items = currentUser?.is_superuser
    ? [...baseItems, { icon: UserCog, title: "ADMIN", path: "/admin" }]
    : baseItems

  return (
    <Sidebar collapsible="icon" className="border-r border-primary/20 bg-background/95 backdrop-blur-md">
      <SidebarHeader className="px-4 py-6 border-b border-border bg-background relative overflow-hidden group group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-4 group-data-[collapsible=icon]:items-center">
        <div className="flex items-center gap-3">
          <div className="p-1.5 border border-primary/50 bg-primary/10 shrink-0">
            <Terminal className="size-6 text-primary" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-lg tracking-widest text-foreground">协同指挥平台</span>
            <span className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">v3.0.0 // TACTICAL-CORE</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-transparent">
        <Main items={items} />
      </SidebarContent>
      <SidebarFooter className="border-t border-primary/20 bg-background/50">
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar

