import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Plus, Search, Send, Trash2, Pencil, Wifi, WifiOff, Activity, Terminal } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"

import { RobotService, type RobotPublic, type RobotCreate, type RobotUpdate } from "@/client/systemApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
    Dialog, DialogClose, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export const Route = createFileRoute("/_layout/robots")({
    component: RobotsPage,
    head: () => ({ meta: [{ title: "UNITS // SYSTEM.MGT" }] }),
})

const robotFormSchema = z.object({
    name: z.string().min(1, "请输入名称"),
    code: z.string().min(1, "请输入编号"),
    ip: z.string().optional(),
})

const COMMANDS = [
    { label: "更新规则", value: "update" },
    { label: "结束考核", value: "end" },
    { label: "更新用户数据", value: "update_user" },
    { label: "全量更新用户", value: "update_user_all" },
    { label: "考核-单杠引体向上", value: "begin_exam_单杠引体向上" },
    { label: "考核-单杠屈臂悬垂", value: "begin_exam_单杠屈臂悬垂" },
    { label: "考核-俯卧撑", value: "begin_exam_俯卧撑" },
    { label: "考核-仰卧卷腹", value: "begin_exam_仰卧卷腹" },
    { label: "考核-30米×2蛇形跑", value: "begin_exam_30米×2蛇形跑" },
    { label: "考核-3000米跑", value: "begin_exam_3000米跑" },
    { label: "训练-单杠引体向上", value: "begin_train_单杠引体向上" },
    { label: "训练-俯卧撑", value: "begin_train_俯卧撑" },
    { label: "训练-仰卧卷腹", value: "begin_train_仰卧卷腹" },
    { label: "体验-单杠引体向上", value: "begin_test_单杠引体向上" },
    { label: "体验-俯卧撑", value: "begin_test_俯卧撑" },
]

function StatusBadge({ robot }: { robot: RobotPublic }) {
    if (!robot.is_online) {
        return <Badge variant="outline" className="gap-1 border-muted-foreground/30 text-muted-foreground rounded-none text-[10px] tracking-widest"><WifiOff className="size-3" /> 离线连接</Badge>
    }
    if (robot.robot_state === 1) {
        return <Badge className="gap-1 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30 rounded-none text-[10px] tracking-widest"><Activity className="size-3 animate-pulse" /> 演训:{robot.current_task}</Badge>
    }
    return <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 rounded-none text-[10px] tracking-widest"><Wifi className="size-3" /> 通信在线</Badge>
}



function RobotsPage() {
    const queryClient = useQueryClient()
    const { showSuccessToast, showErrorToast } = useCustomToast()
    const [search, setSearch] = useState("")
    const [selected, setSelected] = useState<string[]>([])
    const [addOpen, setAddOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [cmdOpen, setCmdOpen] = useState(false)
    const [editingRobot, setEditingRobot] = useState<RobotPublic | null>(null)
    const [cmdTarget, setCmdTarget] = useState<string>("")
    const [selectedCmd, setSelectedCmd] = useState("")

    const { data: robotsData, isLoading } = useQuery({
        queryKey: ["robots", search],
        queryFn: () => RobotService.readRobots({ search: search || undefined, limit: 200 }),
        refetchInterval: 10000,
    })

    const robots = robotsData?.data ?? []

    const addForm = useForm<z.infer<typeof robotFormSchema>>({
        resolver: zodResolver(robotFormSchema) as any,
        defaultValues: { name: "", code: "", ip: "" },
    })

    const editForm = useForm<z.infer<typeof robotFormSchema>>({
        resolver: zodResolver(robotFormSchema) as any,
        defaultValues: { name: "", code: "", ip: "" },
    })

    const addMutation = useMutation({
        mutationFn: (data: RobotCreate) => RobotService.createRobot({ requestBody: data }),
        onSuccess: () => { showSuccessToast("添加成功"); setAddOpen(false); addForm.reset() },
        onError: handleError.bind(showErrorToast),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["robots"] }),
    })

    const editMutation = useMutation({
        mutationFn: (data: RobotUpdate & { id: string }) => RobotService.updateRobot({ id: data.id, requestBody: data }),
        onSuccess: () => { showSuccessToast("编辑成功"); setEditOpen(false) },
        onError: handleError.bind(showErrorToast),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["robots"] }),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => RobotService.deleteRobot({ id }),
        onSuccess: () => showSuccessToast("删除成功"),
        onError: handleError.bind(showErrorToast),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["robots"] }),
    })

    const batchDeleteMutation = useMutation({
        mutationFn: (ids: string[]) => RobotService.batchDeleteRobots({ ids }),
        onSuccess: () => { showSuccessToast("批量删除成功"); setSelected([]) },
        onError: handleError.bind(showErrorToast),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["robots"] }),
    })

    const cmdMutation = useMutation({
        mutationFn: (d: { code: string; command: string }) => RobotService.sendCommand(d),
        onSuccess: () => { showSuccessToast("指令已下发"); setCmdOpen(false) },
        onError: handleError.bind(showErrorToast),
    })

    const batchCmdMutation = useMutation({
        mutationFn: (d: { command: string; robot_codes: string[] }) => RobotService.sendBatchCommand(d),
        onSuccess: () => { showSuccessToast("批量指令已下发"); setCmdOpen(false); setSelected([]) },
        onError: handleError.bind(showErrorToast),
    })

    const openEdit = (robot: RobotPublic) => {
        setEditingRobot(robot)
        editForm.reset({ name: robot.name, code: robot.code, ip: robot.ip || "" })
        setEditOpen(true)
    }

    const openCmd = (code: string) => {
        setCmdTarget(code)
        setSelectedCmd("")
        setCmdOpen(true)
    }

    const toggleSelect = (id: string) => {
        setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
    }
    const toggleAll = () => {
        setSelected(selected.length === robots.length ? [] : robots.map((r) => r.id))
    }

    const onlineCount = robots.filter((r) => r.is_online).length
    const examCount = robots.filter((r) => r.is_online && r.robot_state === 1).length

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/5 border border-primary/30">
                        <Terminal className="size-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-[0.1em] text-foreground">
                            战备执勤序列
                        </h1>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                            编配总数: <span className="text-foreground">{robots.length}</span> // 在线节点: <span className="text-primary">{onlineCount}</span> // 执行任务: <span className="text-amber-500">{examCount}</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {selected.length > 0 && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => { setCmdTarget("batch"); setSelectedCmd(""); setCmdOpen(true) }} className="rounded-none border-primary/50 text-primary hover:bg-primary/10 tracking-widest text-xs">
                                <Send className="mr-2 size-3" /> 批量指令 ({selected.length})
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => batchDeleteMutation.mutate(selected)} className="rounded-none tracking-widest text-xs">
                                <Trash2 className="mr-2 size-3" /> 批量注销
                            </Button>
                        </>
                    )}
                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="rounded-none bg-primary/10 text-primary border border-primary hover:bg-primary hover:text-primary-foreground tracking-widest text-xs">
                                <Plus className="mr-2 size-4" /> 装备注册
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-background border-border rounded-none shadow-xl">
                            <div className="absolute top-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                            <div className="absolute top-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                            <div className="absolute bottom-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                            <div className="absolute bottom-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>

                            <DialogHeader>
                                <DialogTitle className="tracking-[0.1em] text-primary">装备注册登记卡</DialogTitle>
                                <DialogDescription className="font-mono text-xs">录入新配发或换防战备节点数据。</DialogDescription>
                            </DialogHeader>
                            <Form {...addForm}>
                                <form onSubmit={addForm.handleSubmit((d) => addMutation.mutate(d))}>
                                    <div className="grid gap-4 py-4 font-mono">
                                        <FormField control={addForm.control} name="name" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs tracking-widest text-primary">装备代号/名称 <span className="text-destructive">*</span></FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-primary focus-visible:border-primary bg-background" placeholder="装备代号" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={addForm.control} name="code" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs tracking-widest text-primary">出厂编号/标识码 <span className="text-destructive">*</span></FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-primary focus-visible:border-primary bg-background" placeholder="唯一编号" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={addForm.control} name="ip" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs tracking-widest text-primary">网络通信IP</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-primary focus-visible:border-primary bg-background" placeholder="0.0.0.0 (可选)" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild><Button variant="outline" className="rounded-none tracking-widest">取消接入</Button></DialogClose>
                                        <LoadingButton type="submit" loading={addMutation.isPending} className="rounded-none bg-primary text-primary-foreground tracking-widest hover:bg-primary/90">确认注册</LoadingButton>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Search */}
            <div className="flex gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="pl-9 bg-background border-input focus-visible:ring-primary focus-visible:border-primary rounded-none font-mono text-xs"
                        placeholder="检索: 装备代号/标识码..."
                        value={search} onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <Card className="bg-card border border-border rounded-none relative overflow-hidden shadow-none">
                <div className="absolute top-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                <div className="absolute top-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                <div className="absolute bottom-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                <div className="absolute bottom-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-primary/5 border-b border-border text-foreground">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="w-12 text-primary">
                                    <Checkbox className="rounded-sm border-primary/50 data-[state=checked]:bg-primary" checked={selected.length === robots.length && robots.length > 0} onCheckedChange={toggleAll} />
                                </TableHead>
                                <TableHead className="font-bold tracking-widest text-foreground">装备代号</TableHead>
                                <TableHead className="font-bold tracking-widest text-foreground">出厂标识码</TableHead>
                                <TableHead className="font-bold tracking-widest text-foreground">通信IP</TableHead>
                                <TableHead className="font-bold tracking-widest text-foreground">当前状态</TableHead>
                                <TableHead className="font-bold tracking-widest text-foreground">最后通联时间</TableHead>
                                <TableHead className="text-right font-bold tracking-widest text-foreground">操作指挥</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Motion wrapper for TableBody components requires some tricky typing, so we map rows inside regular body but as motion.tr */}
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-mono tracking-widest text-xs uppercase">检索通信链路中...</TableCell></TableRow>
                            ) : robots.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-mono tracking-widest text-xs uppercase opacity-70">未发现任何匹配的战备节点</TableCell></TableRow>
                            ) : (
                                <AnimatePresence>
                                    {robots.map((robot, i) => (
                                        <motion.tr
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            key={robot.id}
                                            className="border-b border-primary/10 hover:bg-primary/5 transition-colors group data-[state=selected]:bg-primary/10"
                                        >
                                            <TableCell><Checkbox className="rounded-sm border-primary/50 data-[state=checked]:bg-primary" checked={selected.includes(robot.id)} onCheckedChange={() => toggleSelect(robot.id)} /></TableCell>
                                            <TableCell className="font-medium text-foreground group-hover:text-primary transition-colors">{robot.name}</TableCell>
                                            <TableCell className="font-mono text-[11px] tracking-wider text-muted-foreground">{robot.code}</TableCell>
                                            <TableCell className="font-mono text-[11px]">{robot.ip || "N/A"}</TableCell>
                                            <TableCell><StatusBadge robot={robot} /></TableCell>
                                            <TableCell className="font-mono text-[10px] text-muted-foreground/70 tracking-wider">
                                                {robot.last_heartbeat ? new Date(robot.last_heartbeat).toLocaleString("zh-CN") : "N/A"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="size-8 rounded-none text-primary hover:bg-primary/20 hover:text-primary border border-transparent hover:border-primary/50 transition-colors" onClick={() => openCmd(robot.code)} title="CMD">
                                                        <Send className="size-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="size-8 rounded-none text-muted-foreground hover:bg-muted/50 border border-transparent hover:border-muted-foreground/30 transition-colors" onClick={() => openEdit(robot)} title="MOD">
                                                        <Pencil className="size-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="size-8 rounded-none text-destructive/70 hover:bg-destructive/20 hover:text-destructive border border-transparent hover:border-destructive/50 transition-colors" onClick={() => deleteMutation.mutate(robot.id)} title="DEL">
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="bg-background border-border rounded-none shadow-xl">
                    <div className="absolute top-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <div className="absolute top-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <div className="absolute bottom-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <div className="absolute bottom-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <DialogHeader><DialogTitle className="tracking-[0.1em] text-foreground">装备参数整编</DialogTitle></DialogHeader>
                    <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit((d) => editingRobot && editMutation.mutate({ ...d, id: editingRobot.id }))}>
                            <div className="grid gap-4 py-4 font-mono">
                                <FormField control={editForm.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs tracking-widest text-primary">装备代号</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-primary bg-background" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={editForm.control} name="code" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs tracking-widest text-primary">标识码</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-primary bg-background" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={editForm.control} name="ip" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs tracking-widest text-primary">通信IP</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-primary bg-background" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="outline" className="rounded-none tracking-widest">取消</Button></DialogClose>
                                <LoadingButton type="submit" loading={editMutation.isPending} className="rounded-none bg-primary text-primary-foreground tracking-widest hover:bg-primary/90">保存整编</LoadingButton>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Command Dialog */}
            <Dialog open={cmdOpen} onOpenChange={setCmdOpen}>
                <DialogContent className="bg-background border-border rounded-none shadow-xl">
                    <div className="absolute top-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <div className="absolute top-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <div className="absolute bottom-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <div className="absolute bottom-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <DialogHeader>
                        <DialogTitle className="tracking-[0.1em] text-foreground font-bold">
                            {cmdTarget === "batch" ? "集群指令下发" : `单点指令下发 // ${cmdTarget}`}
                        </DialogTitle>
                        <DialogDescription className="font-mono text-xs opacity-70">选择要加载的演训指令集。</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 font-mono">
                        <Select value={selectedCmd} onValueChange={setSelectedCmd}>
                            <SelectTrigger className="rounded-none border-input focus:ring-primary bg-background text-xs tracking-wider"><SelectValue placeholder="-- 选择战备指令 --" /></SelectTrigger>
                            <SelectContent className="rounded-none border-border bg-background">
                                {COMMANDS.map((c) => (
                                    <SelectItem key={c.value} value={c.value} className="text-xs tracking-wider focus:bg-primary/10 focus:text-primary rounded-none">{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline" className="rounded-none tracking-widest">取消</Button></DialogClose>
                        <LoadingButton
                            loading={cmdMutation.isPending || batchCmdMutation.isPending}
                            disabled={!selectedCmd}
                            className="rounded-none bg-primary text-primary-foreground tracking-widest hover:bg-primary/90"
                            onClick={() => {
                                if (cmdTarget === "batch") {
                                    const codes = robots.filter((r) => selected.includes(r.id)).map((r) => r.code)
                                    batchCmdMutation.mutate({ command: selectedCmd, robot_codes: codes })
                                } else {
                                    cmdMutation.mutate({ code: cmdTarget, command: selectedCmd })
                                }
                            }}
                        >发射 / 执行</LoadingButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
