import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Plus, Trash2, Terminal } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"

import { DictService, type DictTypePublic } from "@/client/systemApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export const Route = createFileRoute("/_layout/dictionaries")({
    component: DictionariesPage,
    head: () => ({ meta: [{ title: "DICTIONARY // SYSTEM.MGT" }] }),
})

const typeSchema = z.object({ name: z.string().min(1), code: z.string().min(1), description: z.string().optional() })
const itemSchema = z.object({ label: z.string().min(1), value: z.string().min(1), sort_order: z.coerce.number().optional() })



function DictionariesPage() {
    const qc = useQueryClient()
    const { showSuccessToast, showErrorToast } = useCustomToast()
    const [selectedType, setSelectedType] = useState<DictTypePublic | null>(null)
    const [addTypeOpen, setAddTypeOpen] = useState(false)
    const [addItemOpen, setAddItemOpen] = useState(false)

    const { data: typesData, isLoading } = useQuery({ queryKey: ["dict-types"], queryFn: () => DictService.readTypes({ limit: 100 }) })
    const types = typesData?.data ?? []

    const { data: typeDetail } = useQuery({
        queryKey: ["dict-type", selectedType?.id],
        queryFn: async () => selectedType ? await DictService.readTypeWithItems({ id: selectedType.id }) : null,
        enabled: !!selectedType,
    })

    const typeForm = useForm<z.infer<typeof typeSchema>>({ resolver: zodResolver(typeSchema) as any, defaultValues: { name: "", code: "", description: "" } })
    const itemForm = useForm<z.infer<typeof itemSchema>>({ resolver: zodResolver(itemSchema) as any, defaultValues: { label: "", value: "", sort_order: 0 } })

    const addTypeM = useMutation({
        mutationFn: (d: z.infer<typeof typeSchema>) => DictService.createType({ requestBody: d }),
        onSuccess: () => { showSuccessToast("添加成功"); setAddTypeOpen(false); typeForm.reset() },
        onError: handleError.bind(showErrorToast),
        onSettled: () => qc.invalidateQueries({ queryKey: ["dict-types"] }),
    })
    const delTypeM = useMutation({
        mutationFn: (id: string) => DictService.deleteType({ id }),
        onSuccess: () => { showSuccessToast("删除成功"); setSelectedType(null) },
        onError: handleError.bind(showErrorToast),
        onSettled: () => qc.invalidateQueries({ queryKey: ["dict-types"] }),
    })
    const addItemM = useMutation({
        mutationFn: (d: z.infer<typeof itemSchema>) => selectedType ? DictService.createItem({ requestBody: { ...d, dict_type_id: selectedType.id } }) : Promise.reject(),
        onSuccess: () => { showSuccessToast("添加成功"); setAddItemOpen(false); itemForm.reset() },
        onError: handleError.bind(showErrorToast),
        onSettled: () => qc.invalidateQueries({ queryKey: ["dict-type", selectedType?.id] }),
    })
    const delItemM = useMutation({
        mutationFn: (id: string) => DictService.deleteItem({ id }),
        onSuccess: () => showSuccessToast("删除成功"),
        onError: handleError.bind(showErrorToast),
        onSettled: () => qc.invalidateQueries({ queryKey: ["dict-type", selectedType?.id] }),
    })

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/5 border border-secondary/30">
                        <Terminal className="size-6 text-secondary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-widest text-foreground">
                            数据字典
                        </h1>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                            常量注册中心 // <span className="text-secondary">{types.length} 个基类</span>
                        </p>
                    </div>
                </div>
                <Dialog open={addTypeOpen} onOpenChange={setAddTypeOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="rounded-none bg-secondary/10 text-secondary border border-secondary hover:bg-secondary hover:text-secondary-foreground tracking-widest uppercase text-xs">
                            <Plus className="mr-2 size-4" /> 注册基类
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg bg-background border-border rounded-none shadow-xl">
                        <div className="absolute top-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                        <div className="absolute top-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                        <div className="absolute bottom-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                        <div className="absolute bottom-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                        <DialogHeader><DialogTitle className="tracking-widest text-secondary font-bold">注册字典基类</DialogTitle><DialogDescription className="font-mono text-xs text-muted-foreground">配置新的键值对字典体系规范。</DialogDescription></DialogHeader>
                        <Form {...typeForm}><form onSubmit={typeForm.handleSubmit((d) => addTypeM.mutate(d))}>
                            <div className="grid gap-4 py-4 font-mono">
                                <FormField control={typeForm.control} name="name" render={({ field }) => <FormItem><FormLabel className="text-xs tracking-widest text-secondary">基类名称</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background" {...field} /></FormControl><FormMessage /></FormItem>} />
                                <FormField control={typeForm.control} name="code" render={({ field }) => <FormItem><FormLabel className="text-xs tracking-widest text-secondary">基类代码</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background uppercase" {...field} /></FormControl><FormMessage /></FormItem>} />
                                <FormField control={typeForm.control} name="description" render={({ field }) => <FormItem><FormLabel className="text-xs tracking-widest text-secondary">规格描述</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background" {...field} /></FormControl></FormItem>} />
                            </div>
                            <DialogFooter><DialogClose asChild><Button variant="outline" className="rounded-none tracking-widest">取消</Button></DialogClose><LoadingButton type="submit" loading={addTypeM.isPending} className="rounded-none bg-secondary text-secondary-foreground tracking-widest hover:bg-secondary/90">确认保存</LoadingButton></DialogFooter>
                        </form></Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Types List */}
                <Card className="md:col-span-1 bg-card border border-border rounded-none relative overflow-hidden shadow-none">
                    <div className="absolute top-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <div className="absolute top-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <div className="absolute bottom-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <div className="absolute bottom-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <CardHeader className="border-b border-border bg-muted/20"><CardTitle className="tracking-widest text-secondary text-sm font-bold">字典基类库</CardTitle></CardHeader>
                    <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                        {isLoading ? <div className="p-8 text-center text-muted-foreground font-mono text-xs uppercase tracking-widest">检索基类库...</div> : types.length === 0 ? <div className="p-8 text-center text-muted-foreground font-mono text-xs uppercase tracking-widest">未发现有效基类</div> : (
                            <div className="divide-y divide-border">
                                {types.map((t) => (
                                    <div key={t.id} className={`flex items-center justify-between px-4 py-3 cursor-pointer group transition-colors relative ${selectedType?.id === t.id ? "bg-secondary/10" : "hover:bg-secondary/5"}`}
                                        onClick={() => setSelectedType(t)}>
                                        {selectedType?.id === t.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary" />}
                                        <div className="pl-2">
                                            <div className="font-bold tracking-widest text-foreground group-hover:text-secondary transition-colors">{t.name}</div>
                                            <div className="font-mono text-[10px] tracking-widest text-muted-foreground">{t.code}</div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="size-7 rounded-none text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={(e) => { e.stopPropagation(); delTypeM.mutate(t.id) }}><Trash2 className="size-3.5" /></Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Items Detail */}
                <Card className="md:col-span-2 bg-card border border-border rounded-none relative overflow-hidden shadow-none">
                    <div className="absolute top-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <div className="absolute top-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <div className="absolute bottom-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <div className="absolute bottom-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                    <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/20">
                        <CardTitle className="tracking-widest text-secondary text-sm font-bold flex items-center gap-2">
                            {selectedType ? <><span className="text-muted-foreground">目标基类 //</span> {selectedType.name}</> : "等待指令：选择字典基类..."}
                        </CardTitle>
                        {selectedType && (
                            <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
                                <DialogTrigger asChild><Button size="sm" variant="outline" className="rounded-none border-secondary/50 text-secondary hover:bg-secondary/20 tracking-widest text-[10px] h-7 px-2"><Plus className="mr-1 size-3" /> 注册字典项</Button></DialogTrigger>
                                <DialogContent className="sm:max-w-lg bg-background border-border rounded-none shadow-xl">
                                    <div className="absolute top-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                                    <div className="absolute top-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                                    <div className="absolute bottom-1 left-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                                    <div className="absolute bottom-1 right-1 text-muted-foreground/30 font-mono text-[8px]">+</div>
                                    <DialogHeader><DialogTitle className="tracking-widest text-secondary font-bold">注册实例项目</DialogTitle></DialogHeader>
                                    <Form {...itemForm}><form onSubmit={itemForm.handleSubmit((d) => addItemM.mutate(d))}>
                                        <div className="grid gap-4 py-4 font-mono">
                                            <FormField control={itemForm.control} name="label" render={({ field }) => <FormItem><FormLabel className="text-xs tracking-widest text-secondary">显示标签</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background" {...field} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField control={itemForm.control} name="value" render={({ field }) => <FormItem><FormLabel className="text-xs tracking-widest text-secondary">数据键值</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background" {...field} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField control={itemForm.control} name="sort_order" render={({ field }) => <FormItem><FormLabel className="text-xs tracking-widest text-secondary">排序序号</FormLabel><FormControl><Input className="rounded-none border-input focus-visible:ring-secondary bg-background" type="number" {...field} /></FormControl></FormItem>} />
                                        </div>
                                        <DialogFooter><DialogClose asChild><Button variant="outline" className="rounded-none tracking-widest">取消</Button></DialogClose><LoadingButton type="submit" loading={addItemM.isPending} className="rounded-none bg-secondary text-secondary-foreground tracking-widest hover:bg-secondary/90">确认保存</LoadingButton></DialogFooter>
                                    </form></Form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        {!selectedType ? <div className="p-16 text-center text-muted-foreground opacity-50 font-mono tracking-widest text-xs">请选中左侧基类以查阅实例清单</div> : !typeDetail ? <div className="p-16 text-center text-muted-foreground font-mono tracking-widest text-xs">数据检索中...</div> : typeDetail.items.length === 0 ? <div className="p-16 text-center text-muted-foreground font-mono tracking-widest text-xs opacity-50">该基类下暂无可部署的实例数据</div> : (
                            <Table>
                                <TableHeader className="bg-muted/10"><TableRow className="hover:bg-transparent border-border"><TableHead className="tracking-widest text-secondary font-bold">标签展示</TableHead><TableHead className="tracking-widest text-secondary font-bold">参数键值</TableHead><TableHead className="tracking-widest text-secondary font-bold">排序级</TableHead><TableHead className="text-right tracking-widest text-secondary font-bold">操作</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <AnimatePresence>
                                        {typeDetail.items.map((item, i) => (
                                            <motion.tr
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                key={item.id}
                                                className="border-b border-border hover:bg-secondary/5 transition-colors group"
                                            >
                                                <TableCell className="font-medium">{item.label}</TableCell>
                                                <TableCell><Badge variant="outline" className="rounded-none border-secondary/30 text-secondary bg-secondary/10 font-mono text-[10px] tracking-widest">{item.value}</Badge></TableCell>
                                                <TableCell className="font-mono text-xs">{item.sort_order}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="size-8 rounded-none text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={() => delItemM.mutate(item.id)}><Trash2 className="size-4" /></Button>
                                                </TableCell>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
