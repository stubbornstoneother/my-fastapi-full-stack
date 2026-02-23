import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { AnimatePresence, motion } from "framer-motion"
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Terminal,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import {
  type OrganizationCreate,
  type OrganizationTree,
  OrgService,
} from "@/client/systemApi"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export const Route = createFileRoute("/_layout/organizations")({
  component: OrganizationsPage,
  head: () => ({ meta: [{ title: "HIERARCHY // SYSTEM.MGT" }] }),
})

const orgSchema = z.object({
  name: z.string().min(1, "请输入名称"),
  code: z.string().optional(),
  sort_order: z.coerce.number().optional(),
})

const nodeVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 },
}

function TreeNode({
  node,
  onEdit,
  onDelete,
  onAdd,
  level = 0,
  index = 0,
}: {
  node: OrganizationTree
  onEdit: (n: OrganizationTree) => void
  onDelete: (id: string) => void
  onAdd: (pid: string) => void
  level?: number
  index?: number
}) {
  const [open, setOpen] = useState(true)
  const has = node.children?.length > 0
  return (
    <motion.div
      variants={nodeVariants}
      initial="hidden"
      animate="show"
      transition={{ delay: index * 0.05 }}
      className="relative"
    >
      {/* Connection line for nested nodes */}
      {level > 0 && (
        <div
          className="absolute left-[-12px] top-0 bottom-0 w-px bg-secondary/30"
          style={{ left: `${level * 24 - 12}px` }}
        />
      )}
      {level > 0 && (
        <div
          className="absolute top-1/2 w-3 h-px bg-secondary/30"
          style={{ left: `${level * 24 - 12}px` }}
        />
      )}

      <div
        className={`flex items-center gap-2 py-2 px-3 hover:bg-secondary/10 border border-transparent hover:border-secondary/30 transition-all group font-mono relative z-10 ${level === 0 ? "mb-1 bg-secondary/5 border-secondary/20 shadow-sm" : "mb-0"}`}
        style={{ marginLeft: `${level * 24}px` }}
      >
        <button
          className="size-5 flex items-center justify-center text-muted-foreground hover:text-secondary hover:bg-secondary/10 transition-colors"
          onClick={() => setOpen(!open)}
        >
          {has ? (
            open ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )
          ) : (
            <span className="size-4 opacity-30">-</span>
          )}
        </button>
        <Building2
          className={`size-4 ${level === 0 ? "text-secondary" : "text-muted-foreground group-hover:text-secondary transition-colors"}`}
        />
        <span
          className={`font-mono text-xs tracking-wider ${level === 0 ? "font-bold text-foreground" : "text-foreground/80 group-hover:text-secondary transition-colors"}`}
        >
          {node.name}
        </span>
        {node.code && (
          <span className="text-[10px] uppercase text-muted-foreground mr-2 tracking-widest bg-secondary/5 px-1 border border-secondary/20">
            {node.code}
          </span>
        )}
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="size-6 rounded-none text-secondary hover:text-secondary-foreground hover:bg-secondary transition-colors"
            onClick={() => onAdd(node.id)}
          >
            <Plus className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 rounded-none text-muted-foreground hover:bg-muted/50 border border-transparent hover:border-muted-foreground/30 transition-colors"
            onClick={() => onEdit(node)}
          >
            <Pencil className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 rounded-none text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => onDelete(node.id)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
      <AnimatePresence>
        {open && has && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {node.children.map((c, i) => (
              <TreeNode
                key={c.id}
                node={c}
                onEdit={onEdit}
                onDelete={onDelete}
                onAdd={onAdd}
                level={level + 1}
                index={i}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function OrganizationsPage() {
  const qc = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [parentId, setParentId] = useState<string | null>(null)
  const [editing, setEditing] = useState<OrganizationTree | null>(null)
  const { data: tree = [], isLoading } = useQuery({
    queryKey: ["org-tree"],
    queryFn: () => OrgService.readTree(),
  })
  const addForm = useForm<z.infer<typeof orgSchema>>({
    resolver: zodResolver(orgSchema) as any,
    defaultValues: { name: "", code: "", sort_order: 0 },
  })
  const editForm = useForm<z.infer<typeof orgSchema>>({
    resolver: zodResolver(orgSchema) as any,
  })

  const addM = useMutation({
    mutationFn: (d: OrganizationCreate) =>
      OrgService.createOrganization({ requestBody: d }),
    onSuccess: () => {
      showSuccessToast("添加成功")
      setAddOpen(false)
      addForm.reset()
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => qc.invalidateQueries({ queryKey: ["org-tree"] }),
  })
  const editM = useMutation({
    mutationFn: (d: {
      id: string
      name?: string
      code?: string
      sort_order?: number
    }) => OrgService.updateOrganization({ id: d.id, requestBody: d }),
    onSuccess: () => {
      showSuccessToast("编辑成功")
      setEditOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => qc.invalidateQueries({ queryKey: ["org-tree"] }),
  })
  const delM = useMutation({
    mutationFn: (id: string) => OrgService.deleteOrganization({ id }),
    onSuccess: () => showSuccessToast("删除成功"),
    onError: handleError.bind(showErrorToast),
    onSettled: () => qc.invalidateQueries({ queryKey: ["org-tree"] }),
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
              组织架构
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
              根节点数量: <span className="text-secondary">{tree.length}</span>
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setParentId(null)
            addForm.reset()
            setAddOpen(true)
          }}
          className="rounded-none bg-secondary/10 text-secondary border border-secondary hover:bg-secondary hover:text-secondary-foreground tracking-widest text-xs"
        >
          <Plus className="mr-2 size-4" /> 注册根节点
        </Button>
      </div>

      <Card className="bg-card border border-border rounded-none relative overflow-hidden shadow-none">
        <div className="absolute top-1 left-1 text-muted-foreground/30 font-mono text-[8px]">
          +
        </div>
        <div className="absolute top-1 right-1 text-muted-foreground/30 font-mono text-[8px]">
          +
        </div>
        <div className="absolute bottom-1 left-1 text-muted-foreground/30 font-mono text-[8px]">
          +
        </div>
        <div className="absolute bottom-1 right-1 text-muted-foreground/30 font-mono text-[8px]">
          +
        </div>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground font-mono tracking-widest text-xs uppercase">
              结构映射中...
            </div>
          ) : tree.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground font-mono tracking-widest text-xs uppercase opacity-70">
              未发现组织层级架构定义
            </div>
          ) : (
            <div className="pl-2 border-l border-secondary/20 py-2">
              {tree.map((n, i) => (
                <TreeNode
                  key={n.id}
                  node={n}
                  index={i}
                  onEdit={(o) => {
                    setEditing(o)
                    editForm.reset({
                      name: o.name,
                      code: o.code || "",
                      sort_order: o.sort_order,
                    })
                    setEditOpen(true)
                  }}
                  onDelete={(id) => delM.mutate(id)}
                  onAdd={(pid) => {
                    setParentId(pid)
                    addForm.reset()
                    setAddOpen(true)
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg bg-background border-border rounded-none shadow-xl">
          <div className="absolute top-1 left-1 text-muted-foreground/30 font-mono text-[8px]">
            +
          </div>
          <div className="absolute top-1 right-1 text-muted-foreground/30 font-mono text-[8px]">
            +
          </div>
          <div className="absolute bottom-1 left-1 text-muted-foreground/30 font-mono text-[8px]">
            +
          </div>
          <div className="absolute bottom-1 right-1 text-muted-foreground/30 font-mono text-[8px]">
            +
          </div>
          <DialogHeader>
            <DialogTitle className="tracking-widest text-secondary font-bold">
              {parentId ? "扩展子节点" : "注册根节点"}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-muted-foreground">
              配置组织结构特征参数。
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form
              onSubmit={addForm.handleSubmit((d) =>
                addM.mutate({ ...d, parent_id: parentId || undefined }),
              )}
            >
              <div className="grid gap-4 py-4 font-mono">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs tracking-widest text-secondary">
                        节点名称 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="rounded-none border-input focus-visible:ring-secondary bg-background"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs tracking-widest text-secondary">
                        节点代码
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="rounded-none border-input focus-visible:ring-secondary bg-background uppercase"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="sort_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs tracking-widest text-secondary">
                        排序优先级
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="rounded-none border-input focus-visible:ring-secondary bg-background"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    className="rounded-none tracking-widest"
                  >
                    取消
                  </Button>
                </DialogClose>
                <LoadingButton
                  type="submit"
                  loading={addM.isPending}
                  className="rounded-none bg-secondary text-secondary-foreground tracking-widest hover:bg-secondary/90"
                >
                  确认注册
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg bg-background border-border rounded-none shadow-xl">
          <div className="absolute top-1 left-1 text-muted-foreground/30 font-mono text-[8px]">
            +
          </div>
          <div className="absolute top-1 right-1 text-muted-foreground/30 font-mono text-[8px]">
            +
          </div>
          <div className="absolute bottom-1 left-1 text-muted-foreground/30 font-mono text-[8px]">
            +
          </div>
          <div className="absolute bottom-1 right-1 text-muted-foreground/30 font-mono text-[8px]">
            +
          </div>
          <DialogHeader>
            <DialogTitle className="tracking-widest text-secondary font-bold">
              修改节点配置
            </DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(
                (d) => editing && editM.mutate({ ...d, id: editing.id }),
              )}
            >
              <div className="grid gap-4 py-4 font-mono">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs tracking-widest text-secondary">
                        节点名称
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="rounded-none border-input focus-visible:ring-secondary bg-background"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs tracking-widest text-secondary">
                        节点代码
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="rounded-none border-input focus-visible:ring-secondary bg-background uppercase"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="sort_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs tracking-widest text-secondary">
                        排序优先级
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="rounded-none border-input focus-visible:ring-secondary bg-background"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    className="rounded-none tracking-widest"
                  >
                    取消
                  </Button>
                </DialogClose>
                <LoadingButton
                  type="submit"
                  loading={editM.isPending}
                  className="rounded-none bg-secondary text-secondary-foreground tracking-widest hover:bg-secondary/90"
                >
                  保存修改
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
