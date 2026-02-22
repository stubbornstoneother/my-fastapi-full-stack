import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { motion } from "framer-motion"
import { Bot, Users, Wifi, Activity, Building2, BookOpen, ArrowRight, Terminal } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RobotService, PersonService, LogService } from "@/client/systemApi"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "控制中心 - SYSTEM.MGT" }] }),
})

const containerVariants: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
}

function Dashboard() {
  const { data: robotsData } = useQuery({
    queryKey: ["robots"],
    queryFn: () => RobotService.readRobots({ limit: 200 }),
    refetchInterval: 10000,
  })
  const { data: personsData } = useQuery({
    queryKey: ["persons-count"],
    queryFn: () => PersonService.readPersons({ limit: 1 }),
  })
  const { data: logsData } = useQuery({
    queryKey: ["logs-recent"],
    queryFn: () => LogService.readLogs({ limit: 5 }),
  })

  const robots = robotsData?.data ?? []
  const totalPersons = personsData?.count ?? 0
  const onlineRobots = robots.filter((r) => r.is_online)
  const examRobots = robots.filter((r) => r.is_online && r.robot_state === 1)
  const recentLogs = logsData?.data ?? []

  const stats = [
    { title: "列装装备总数", value: robots.length, icon: Bot, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20", line: "border-l-primary" },
    { title: "通信在线连接", value: onlineRobots.length, icon: Wifi, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", line: "border-l-emerald-500" },
    { title: "实兵演训执行中", value: examRobots.length, icon: Activity, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", line: "border-l-amber-500" },
    { title: "在编参训人员", value: totalPersons, icon: Users, color: "text-secondary", bg: "bg-secondary/10", border: "border-secondary/20", line: "border-l-secondary" },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-8"
    >
      <motion.div variants={itemVariants} className="flex items-center gap-3 border-b border-border pb-4">
        <div className="p-2 border border-primary/30 bg-primary/5">
          <Terminal className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-widest text-foreground">协同指挥控制中心</h1>
          <p className="text-muted-foreground font-mono text-[10px] tracking-widest mt-1 opacity-80">SYS.STATUS: ONLINE // UPTIME: OK</p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants as any} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.title} className={`bg-card border ${s.border} border-l-4 ${s.line} rounded-none shadow-none relative overflow-hidden group`}>
            {/* Tactical crosshairs */}
            <div className="absolute top-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
            <div className="absolute bottom-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>

            <CardContent className="flex items-center gap-4 p-5">
              <div className={`p-2.5 ${s.bg} border-b-2 ${s.line}`}>
                <s.icon className={`size-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs tracking-widest text-muted-foreground mb-1">{s.title}</p>
                <p className="text-3xl font-mono font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Online Robots */}
        <motion.div variants={itemVariants as any}>
          <Card className="bg-card border border-border rounded-none h-full flex flex-col relative overflow-hidden transition-colors hover:border-primary/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50 bg-primary/5">
              <CardTitle className="text-sm font-bold tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-4 bg-primary" />
                战备执勤序列
                <span className="font-mono text-[10px] text-muted-foreground/60 font-normal ml-2">ACTIVE_UNITS</span>
              </CardTitle>
              <Link to="/robots"><Button variant="ghost" size="sm" className="font-mono text-xs text-primary hover:bg-primary/10 hover:text-primary rounded-none h-7">查看全部 <ArrowRight className="ml-1 size-3" /></Button></Link>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              {onlineRobots.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-8 opacity-40">
                  <Bot className="size-10 mb-3 text-muted-foreground" />
                  <p className="text-xs tracking-widest">当前无战备执勤装备</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {onlineRobots.slice(0, 5).map((r) => (
                    <div key={r.id} className="group flex items-center justify-between py-2 px-3 bg-background border border-border/50 hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-50"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{r.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{r.code}</p>
                        </div>
                      </div>
                      {r.robot_state === 1 ? (
                        <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-sm text-[10px] tracking-widest font-mono">TASK:{r.current_task}</Badge>
                      ) : (
                        <Badge variant="outline" className="border-primary/30 text-primary rounded-sm text-[10px] tracking-widest bg-primary/5 font-mono">IDLE</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Logs */}
        <motion.div variants={itemVariants as any}>
          <Card className="bg-card border border-border rounded-none h-full flex flex-col relative overflow-hidden transition-colors hover:border-secondary/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50 bg-secondary/5">
              <CardTitle className="text-sm font-bold tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-4 bg-secondary" />
                系统活动日志
                <span className="font-mono text-[10px] text-muted-foreground/60 font-normal ml-2">SYS_LOGS</span>
              </CardTitle>
              <Link to="/logs"><Button variant="ghost" size="sm" className="font-mono text-xs text-secondary hover:bg-secondary/10 hover:text-secondary rounded-none h-7">查看日志 <ArrowRight className="ml-1 size-3" /></Button></Link>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              {recentLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-8 opacity-40">
                  <Terminal className="size-10 mb-3 text-muted-foreground" />
                  <p className="text-xs tracking-widest">暂无记录</p>
                </div>
              ) : (
                <div className="space-y-1 font-mono">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 py-1.5 border-b border-border/30 last:border-0 hover:bg-white/5 transition-colors">
                      <Badge
                        variant="outline"
                        className={`text-[9px] mt-0.5 shrink-0 rounded-none tracking-widest border border-y-0 border-r-0 pl-1.5 py-0 uppercase
                          ${log.level === "error" ? "border-l-destructive text-destructive" : log.level === "warn" ? "border-l-amber-500 text-amber-500" : "border-l-primary text-primary"}
                        `}
                      >
                        {log.level}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs truncate text-foreground/80">{log.message}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">{log.created_at ? new Date(log.created_at).toLocaleString("zh-CN") : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Links */}
      <motion.div variants={itemVariants as any} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "装备管理", desc: "管控与指令下发", icon: Bot, to: "/robots" },
          { title: "人员档案", desc: "编制与受训记录", icon: Users, to: "/persons" },
          { title: "部队架构", desc: "组织层级与驻地", icon: Building2, to: "/organizations" },
          { title: "系统字典", desc: "核心参数配置", icon: BookOpen, to: "/dictionaries" },
        ].map((link) => (
          <Link key={link.to} to={link.to}>
            <Card className="bg-card hover:bg-primary/5 border border-border rounded-none hover:border-primary/50 transition-all duration-300 cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 border border-border bg-background group-hover:border-primary/50 transition-colors">
                  <link.icon className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="font-bold text-sm tracking-widest group-hover:text-primary transition-colors">{link.title}</p>
                  <p className="text-[10px] text-muted-foreground">{link.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </motion.div>
    </motion.div>
  )
}

