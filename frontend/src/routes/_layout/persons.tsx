import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Search, Trash2, Pencil, Upload, Download, UserPlus, Terminal } from "lucide-react"
import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"

import { PersonService, type PersonInfoPublic, type PersonInfoCreate, type PersonInfoUpdate } from "@/client/systemApi"
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
import { OpenAPI } from "@/client/core/OpenAPI"

export const Route = createFileRoute("/_layout/persons")({
    component: PersonsPage,
    head: () => ({ meta: [{ title: "PERSONNEL // SYSTEM.MGT" }] }),
})

const personFormSchema = z.object({
    name: z.string().min(1, "请输入姓名"),
    gender: z.string().min(1, "请选择性别"),
    age: z.coerce.number().min(1, "请输入年龄"),
    height: z.string().optional(),
    weight: z.string().optional(),
    card_id: z.string().min(1, "请输入身份证号"),
    soldier_id: z.string().min(1, "请输入军人证号"),
    category_name: z.string().min(1, "请选择人员类别"),
    category: z.string().min(1),
    difficulty: z.string().min(1, "请选择考核难度"),
    title: z.string().optional(),
    disease: z.string().optional(),
})

const CATEGORIES = [
    { label: "一类人员", value: "1", name: "一类人员" },
    { label: "二类人员", value: "2", name: "二类人员" },
    { label: "三类人员", value: "3", name: "三类人员" },
    { label: "四类人员", value: "4", name: "四类人员" },
]

const DIFFICULTIES = [
    { label: "困难", value: "1" },
    { label: "一般", value: "2" },
    { label: "简单", value: "3" },
]



function PersonsPage() {
    const queryClient = useQueryClient()
    const { showSuccessToast, showErrorToast } = useCustomToast()
    const [search, setSearch] = useState("")
    const [selected, setSelected] = useState<string[]>([])
    const [addOpen, setAddOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [editingPerson, setEditingPerson] = useState<PersonInfoPublic | null>(null)
    const [page, setPage] = useState(0)
    const PAGE_SIZE = 20
    const fileInputRef = useRef<HTMLInputElement>(null)

    const { data: personsData, isLoading } = useQuery({
        queryKey: ["persons", search, page],
        queryFn: () => PersonService.readPersons({ search: search || undefined, skip: page * PAGE_SIZE, limit: PAGE_SIZE }),
    })

    const persons = personsData?.data ?? []
    const totalCount = personsData?.count ?? 0

    const addForm = useForm<z.infer<typeof personFormSchema>>({
        resolver: zodResolver(personFormSchema) as any,
        defaultValues: {
            name: "", gender: "男", age: 20, height: "", weight: "",
            card_id: "", soldier_id: "", category_name: "一类人员", category: "1",
            difficulty: "2", title: "", disease: "否",
        },
    })

    const editForm = useForm<z.infer<typeof personFormSchema>>({
        resolver: zodResolver(personFormSchema) as any,
    })

    const addMutation = useMutation({
        mutationFn: (data: PersonInfoCreate) => PersonService.createPerson({ requestBody: data }),
        onSuccess: () => { showSuccessToast("添加成功"); setAddOpen(false); addForm.reset() },
        onError: handleError.bind(showErrorToast),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["persons"] }),
    })

    const editMutation = useMutation({
        mutationFn: (data: PersonInfoUpdate & { id: string }) => {
            const { id, ...rest } = data
            return PersonService.updatePerson({ id, requestBody: rest })
        },
        onSuccess: () => { showSuccessToast("编辑成功"); setEditOpen(false) },
        onError: handleError.bind(showErrorToast),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["persons"] }),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => PersonService.deletePerson({ id }),
        onSuccess: () => showSuccessToast("删除成功"),
        onError: handleError.bind(showErrorToast),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["persons"] }),
    })

    const batchDeleteMutation = useMutation({
        mutationFn: (ids: string[]) => PersonService.batchDeletePersons({ ids }),
        onSuccess: () => { showSuccessToast("批量删除成功"); setSelected([]) },
        onError: handleError.bind(showErrorToast),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["persons"] }),
    })

    const openEdit = (p: PersonInfoPublic) => {
        setEditingPerson(p)
        editForm.reset({
            name: p.name, gender: p.gender, age: p.age,
            height: p.height || "", weight: p.weight || "",
            card_id: p.card_id, soldier_id: p.soldier_id,
            category_name: p.category_name, category: p.category,
            difficulty: p.difficulty, title: p.title || "",
            disease: p.disease || "",
        })
        setEditOpen(true)
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const formData = new FormData()
        formData.append("file", file)
        try {
            const resp = await fetch("/api/v1/system/persons/import", {
                method: "POST",
                headers: { Authorization: `Bearer ${OpenAPI.TOKEN}` },
                body: formData,
            })
            const data = await resp.json()
            if (!resp.ok) throw new Error(data.detail)
            showSuccessToast(data.message || "导入完成")
            queryClient.invalidateQueries({ queryKey: ["persons"] })
        } catch (err: any) {
            showErrorToast(err.message || "导入失败")
        }
        e.target.value = ""
    }

    const downloadTemplate = () => {
        window.open(`/api/v1/system/persons/template`, "_blank")
    }

    const toggleSelect = (id: string) => setSelected((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id])
    const toggleAll = () => setSelected(selected.length === persons.length ? [] : persons.map((p) => p.id))
    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    const getDifficultyLabel = (v: string) => DIFFICULTIES.find((d) => d.value === v)?.label || v

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/5 border border-secondary/30">
                        <Terminal className="size-6 text-secondary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-[0.1em] text-foreground">
                            人员编制数据库
                        </h1>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                            总编配人数: <span className="text-secondary">{totalCount}</span> // 当前数据分段: <span className="text-foreground">{page + 1}/{Math.max(1, totalPages)}</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImport} />
                    <Button variant="outline" size="sm" onClick={downloadTemplate} className="rounded-none border-secondary/50 text-secondary hover:bg-secondary/10 tracking-widest text-xs">
                        <Download className="mr-2 size-3" /> 下载录入模板
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-none border-secondary/50 text-secondary hover:bg-secondary/10 tracking-widest text-xs">
                        <Upload className="mr-2 size-3" /> 批量导入数据
                    </Button>
                    {selected.length > 0 && (
                        <Button variant="destructive" size="sm" onClick={() => batchDeleteMutation.mutate(selected)} className="rounded-none tracking-widest text-xs">
                            <Trash2 className="mr-2 size-3" /> 批量注销 ({selected.length})
                        </Button>
                    )}
                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="rounded-none bg-secondary/10 text-secondary border border-secondary hover:bg-secondary hover:text-secondary-foreground tracking-widest text-xs">
                                <UserPlus className="mr-2 size-4" /> 人员注册登记
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-background border-border rounded-none shadow-xl">
                            <div className="absolute top-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                            <div className="absolute top-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                            <div className="absolute bottom-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                            <div className="absolute bottom-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                            <DialogHeader>
                                <DialogTitle className="tracking-[0.1em] text-secondary font-bold">人员防务登记卡</DialogTitle>
                                <DialogDescription className="font-mono text-xs text-muted-foreground">录入人员生物识别与编制身份数据。</DialogDescription>
                            </DialogHeader>
                            <Form {...addForm}>
                                <form onSubmit={addForm.handleSubmit((d) => addMutation.mutate(d as PersonInfoCreate))}>
                                    <div className="grid grid-cols-2 gap-4 py-4 font-mono">
                                        <FormField control={addForm.control} name="name" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs tracking-widest text-secondary">姓名 <span className="text-destructive">*</span></FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={addForm.control} name="gender" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs tracking-widest text-secondary">性别 <span className="text-destructive">*</span></FormLabel><FormControl>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger className="rounded-none border-input focus:ring-secondary bg-background"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="rounded-none border-border bg-background"><SelectItem value="男">男</SelectItem><SelectItem value="女">女</SelectItem></SelectContent>
                                                </Select>
                                            </FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={addForm.control} name="age" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs tracking-widest text-secondary">年龄 <span className="text-destructive">*</span></FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background" type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={addForm.control} name="card_id" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs tracking-widest text-secondary">居民身份证号 <span className="text-destructive">*</span></FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={addForm.control} name="soldier_id" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs tracking-widest text-secondary">军官/士兵证号 <span className="text-destructive">*</span></FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={addForm.control} name="category" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs tracking-widest text-secondary">人员类别 <span className="text-destructive">*</span></FormLabel><FormControl>
                                                <Select value={field.value} onValueChange={(v) => { field.onChange(v); const c = CATEGORIES.find((x) => x.value === v); if (c) addForm.setValue("category_name", c.name) }}>
                                                    <SelectTrigger className="rounded-none border-input focus:ring-secondary bg-background"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="rounded-none border-border bg-background">{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={addForm.control} name="difficulty" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs tracking-widest text-secondary">体能考核标准 <span className="text-destructive">*</span></FormLabel><FormControl>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger className="rounded-none border-input focus:ring-secondary bg-background"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="rounded-none border-border bg-background">{DIFFICULTIES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={addForm.control} name="height" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs tracking-widest text-secondary">身高 (CM)</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background" {...field} /></FormControl></FormItem>
                                        )} />
                                        <FormField control={addForm.control} name="weight" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs tracking-widest text-secondary">体重 (KG)</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background" {...field} /></FormControl></FormItem>
                                        )} />
                                        <FormField control={addForm.control} name="title" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs tracking-widest text-secondary">职务/军衔</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background" {...field} /></FormControl></FormItem>
                                        )} />
                                        <FormField control={addForm.control} name="disease" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs tracking-widest text-secondary">伤病免考状态</FormLabel><FormControl>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger className="rounded-none border-input focus:ring-secondary bg-background"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="rounded-none border-border bg-background"><SelectItem value="是">是</SelectItem><SelectItem value="否">否</SelectItem></SelectContent>
                                                </Select>
                                            </FormControl></FormItem>
                                        )} />
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild><Button variant="outline" className="rounded-none tracking-widest">取消登记</Button></DialogClose>
                                        <LoadingButton type="submit" loading={addMutation.isPending} className="rounded-none bg-secondary text-secondary-foreground tracking-widest hover:bg-secondary/90">确认录入</LoadingButton>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9 bg-background border-input focus-visible:ring-secondary focus-visible:border-secondary rounded-none font-mono text-xs" placeholder="检索: 姓名/身份证号..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }} />
                </div>
            </div>

            <Card className="bg-card border border-border rounded-none relative overflow-hidden shadow-none">
                <div className="absolute top-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                <div className="absolute top-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                <div className="absolute bottom-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                <div className="absolute bottom-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-secondary/5 border-b border-border text-foreground">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="w-12 text-secondary"><Checkbox className="rounded-sm border-secondary/50 data-[state=checked]:bg-secondary" checked={selected.length === persons.length && persons.length > 0} onCheckedChange={toggleAll} /></TableHead>
                                <TableHead className="font-bold tracking-widest text-foreground">姓名</TableHead>
                                <TableHead className="font-bold tracking-widest text-foreground">性别</TableHead>
                                <TableHead className="font-bold tracking-widest text-foreground">年龄</TableHead>
                                <TableHead className="font-bold tracking-widest text-foreground">身份证号</TableHead>
                                <TableHead className="font-bold tracking-widest text-foreground">人员类别</TableHead>
                                <TableHead className="font-bold tracking-widest text-foreground">考核标准</TableHead>
                                <TableHead className="font-bold tracking-widest text-foreground">职务/军衔</TableHead>
                                <TableHead className="text-right font-bold tracking-widest text-foreground">档案操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground font-mono tracking-widest text-xs uppercase">检索人事档案中...</TableCell></TableRow>
                            ) : persons.length === 0 ? (
                                <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground font-mono tracking-widest text-xs uppercase opacity-70">未发现匹配的人事档案</TableCell></TableRow>
                            ) : (
                                <AnimatePresence>
                                    {persons.map((p, i) => (
                                        <motion.tr
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            key={p.id}
                                            className="border-b border-secondary/10 hover:bg-secondary/5 transition-colors group data-[state=selected]:bg-secondary/10"
                                        >
                                            <TableCell><Checkbox className="rounded-sm border-secondary/50 data-[state=checked]:bg-secondary" checked={selected.includes(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></TableCell>
                                            <TableCell className="font-medium text-foreground group-hover:text-secondary transition-colors">{p.name}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{p.gender}</TableCell>
                                            <TableCell className="font-mono text-xs">{p.age}</TableCell>
                                            <TableCell className="font-mono text-[11px] text-muted-foreground">{p.card_id}</TableCell>
                                            <TableCell><Badge variant="outline" className="rounded-none border-secondary/30 text-secondary/80 bg-secondary/10 tracking-widest text-[10px] uppercase">{p.category_name}</Badge></TableCell>
                                            <TableCell className="font-mono text-xs">{getDifficultyLabel(p.difficulty)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{p.title || "-"}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="size-8 rounded-none text-muted-foreground hover:bg-muted/50 border border-transparent hover:border-muted-foreground/30 transition-colors" onClick={() => openEdit(p)} title="MOD"><Pencil className="size-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="size-8 rounded-none text-destructive/70 hover:bg-destructive/20 hover:text-destructive border border-transparent hover:border-destructive/50 transition-colors" onClick={() => deleteMutation.mutate(p.id)} title="DEL"><Trash2 className="size-4" /></Button>
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

            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-none tracking-widest border-input">上一页</Button>
                    <span className="flex items-center text-xs tracking-widest text-muted-foreground">第 {page + 1} / {totalPages} 页</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="rounded-none tracking-widest border-input">下一页</Button>
                </div>
            )}

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-background border-border rounded-none shadow-xl">
                    <div className="absolute top-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <div className="absolute top-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <div className="absolute bottom-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <div className="absolute bottom-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <DialogHeader><DialogTitle className="tracking-[0.1em] text-secondary font-bold">人事档案整编</DialogTitle></DialogHeader>
                    <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit((d) => editingPerson && editMutation.mutate({ ...d, id: editingPerson.id } as PersonInfoUpdate & { id: string }))}>
                            <div className="grid grid-cols-2 gap-4 py-4 font-mono">
                                <FormField control={editForm.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs tracking-widest text-secondary">姓名</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={editForm.control} name="gender" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs tracking-widest text-secondary">性别</FormLabel><FormControl>
                                        <Select value={field.value} onValueChange={field.onChange}><SelectTrigger className="rounded-none border-input focus:ring-secondary bg-background"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-none border-border bg-background"><SelectItem value="男">男</SelectItem><SelectItem value="女">女</SelectItem></SelectContent></Select>
                                    </FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={editForm.control} name="age" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs tracking-widest text-secondary">年龄</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background" type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={editForm.control} name="card_id" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs tracking-widest text-secondary">居民身份证号</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={editForm.control} name="soldier_id" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs tracking-widest text-secondary">军官/士兵证号</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={editForm.control} name="category" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs tracking-widest text-secondary">人员类别</FormLabel><FormControl>
                                        <Select value={field.value} onValueChange={(v) => { field.onChange(v); const c = CATEGORIES.find((x) => x.value === v); if (c) editForm.setValue("category_name", c.name) }}>
                                            <SelectTrigger className="rounded-none border-input focus:ring-secondary bg-background"><SelectValue /></SelectTrigger><SelectContent className="rounded-none border-border bg-background">{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={editForm.control} name="difficulty" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs tracking-widest text-secondary">体能考核标准</FormLabel><FormControl>
                                        <Select value={field.value} onValueChange={field.onChange}><SelectTrigger className="rounded-none border-input focus:ring-secondary bg-background"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-none border-border bg-background">{DIFFICULTIES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent></Select>
                                    </FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={editForm.control} name="title" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs tracking-widest text-secondary">职务/军衔</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background" {...field} /></FormControl></FormItem>
                                )} />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="outline" className="rounded-none tracking-widest">取消</Button></DialogClose>
                                <LoadingButton type="submit" loading={editMutation.isPending} className="rounded-none bg-secondary text-secondary-foreground tracking-widest hover:bg-secondary/90">保存整编</LoadingButton>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
