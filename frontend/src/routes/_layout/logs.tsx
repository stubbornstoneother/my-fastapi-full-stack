import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Filter, Terminal } from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

import { LogService } from "@/client/systemApi"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_layout/logs")({
    component: LogsPage,
    head: () => ({ meta: [{ title: "SYS_LOGS // SYSTEM.MGT" }] }),
})



function LogsPage() {
    const [logType, setLogType] = useState<string>("")
    const [level, setLevel] = useState<string>("")
    const [page, setPage] = useState(0)
    const PAGE_SIZE = 50

    const { data, isLoading } = useQuery({
        queryKey: ["logs", logType, level, page],
        queryFn: () => LogService.readLogs({
            log_type: logType || undefined, level: level || undefined,
            skip: page * PAGE_SIZE, limit: PAGE_SIZE,
        }),
        refetchInterval: 15000,
    })

    const logs = data?.data ?? []
    const total = data?.count ?? 0
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    const getLevelBadgeProps = (l: string) => {
        if (l === "error") return { className: "bg-destructive/10 text-destructive border-destructive/50" }
        if (l === "warn") return { className: "bg-amber-500/10 text-amber-500 border-amber-500/50" }
        return { className: "bg-secondary/10 text-secondary border-secondary/30" }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/5 border border-secondary/30">
                        <Terminal className="size-6 text-secondary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-widest text-foreground">
                            系统事件日志
                        </h1>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                            事件总记录数: <span className="text-secondary">{total}</span> // 实时监控信道已建立
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <Filter className="size-4 text-secondary/70" />
                    <Select value={logType} onValueChange={(v) => { setLogType(v === "all" ? "" : v); setPage(0) }}>
                        <SelectTrigger className="w-32 rounded-none border-border bg-background/50 focus:ring-secondary focus:border-secondary text-xs tracking-widest font-bold"><SelectValue placeholder="源级模块" /></SelectTrigger>
                        <SelectContent className="rounded-none border-border bg-background shadow-xl">
                            <SelectItem value="all" className="text-xs tracking-widest font-bold">全局信源</SelectItem>
                            <SelectItem value="robot" className="text-xs tracking-widest font-bold">前端装备</SelectItem>
                            <SelectItem value="system" className="text-xs tracking-widest font-bold">系统核心</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={level} onValueChange={(v) => { setLevel(v === "all" ? "" : v); setPage(0) }}>
                        <SelectTrigger className="w-32 rounded-none border-border bg-background/50 focus:ring-secondary focus:border-secondary text-xs tracking-widest font-bold"><SelectValue placeholder="警报等级" /></SelectTrigger>
                        <SelectContent className="rounded-none border-border bg-background shadow-xl">
                            <SelectItem value="all" className="text-xs tracking-widest font-bold">整体监控</SelectItem>
                            <SelectItem value="info" className="text-xs tracking-widest font-bold">常规信息</SelectItem>
                            <SelectItem value="warn" className="text-xs tracking-widest font-bold text-amber-500">异常预警</SelectItem>
                            <SelectItem value="error" className="text-xs tracking-widest font-bold text-destructive">严重错误</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card className="bg-card border border-border rounded-none relative overflow-hidden shadow-none">
                <div className="absolute top-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                <div className="absolute top-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                <div className="absolute bottom-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                <div className="absolute bottom-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/10 border-b border-border">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-44 tracking-widest text-secondary font-bold">记录时间戳</TableHead>
                                <TableHead className="w-24 tracking-widest text-secondary font-bold">发生源级</TableHead>
                                <TableHead className="w-20 tracking-widest text-secondary font-bold">处置层级</TableHead>
                                <TableHead className="tracking-widest text-secondary font-bold">事件具体内容</TableHead>
                                <TableHead className="w-28 tracking-widest text-secondary font-bold">节点代号</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-mono tracking-widest text-xs uppercase">监听并拦截数据流中...</TableCell></TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-mono tracking-widest text-xs uppercase opacity-70">当前频段未截获任何异常事件</TableCell></TableRow>
                            ) : (
                                <AnimatePresence>
                                    {logs.map((log, i) => (
                                        <motion.tr
                                            initial={{ opacity: 0, x: -5 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            key={log.id}
                                            className="border-b border-border hover:bg-secondary/5 transition-colors group font-mono"
                                        >
                                            <TableCell className="text-xs text-muted-foreground tracking-wider">{log.created_at ? new Date(log.created_at).toLocaleString("zh-CN") : "-"}</TableCell>
                                            <TableCell><Badge variant="outline" className="rounded-none border-secondary/30 bg-secondary/10 tracking-widest text-[10px] uppercase text-secondary/80 font-mono">{log.log_type}</Badge></TableCell>
                                            <TableCell><Badge variant="outline" className={`rounded-none tracking-widest text-[10px] uppercase font-mono ${getLevelBadgeProps(log.level).className}`}>{log.level}</Badge></TableCell>
                                            <TableCell className="max-w-md truncate text-xs text-foreground/90 group-hover:text-secondary transition-colors">{log.message}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground tracking-wider">{log.robot_code || "-"}</TableCell>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-none border-border text-secondary hover:bg-secondary/10 tracking-widest text-xs">上一页区块</Button>
                    <span className="flex items-center text-xs font-mono tracking-widest text-muted-foreground">索引页 {page + 1} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="rounded-none border-border text-secondary hover:bg-secondary/10 tracking-widest text-xs">下一页区块</Button>
                </div>
            )}
        </div>
    )
}
