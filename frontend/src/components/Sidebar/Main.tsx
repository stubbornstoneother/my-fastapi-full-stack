import { Link as RouterLink, useRouterState } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export type Item = {
  icon: LucideIcon
  title: string
  path: string
}

interface MainProps {
  items: Item[]
}

export function Main({ items }: MainProps) {
  const { isMobile, setOpenMobile } = useSidebar()
  const router = useRouterState()
  const currentPath = router.location.pathname

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <SidebarGroup className="p-0">
      <SidebarGroupContent>
        <SidebarMenu className="gap-2 px-3 mt-4">
          {items.map((item) => {
            const isActive = currentPath === item.path

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  asChild
                  className={`relative overflow-hidden h-11 transition-all duration-200 rounded-none ${
                    isActive
                      ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <RouterLink
                    to={item.path}
                    onClick={handleMenuClick}
                    className="flex items-center gap-3 w-full group"
                  >
                    {/* Active tactical line */}
                    {isActive && (
                      <span className="absolute left-0 top-0 w-[4px] h-full bg-primary" />
                    )}

                    <item.icon
                      className={`size-5 transition-colors duration-200 ${isActive ? "text-primary" : "opacity-70 group-hover:text-primary group-hover:opacity-100"}`}
                    />
                    <span className="font-bold tracking-widest text-sm group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                  </RouterLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
