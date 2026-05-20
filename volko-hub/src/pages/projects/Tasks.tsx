import { useState } from "react";
import { useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { TASK_STATUS_LABELS } from "../../../db/schema";

const PRIORITY_LABELS: Record<string, string> = { low: "Zema", medium: "Vidēja", high: "Augsta", urgent: "Steidzami" };
const PRIORITY_COLORS: Record<string, string> = { low: "text-slate-400", medium: "text-yellow-500", high: "text-orange-500", urgent: "text-red-500" };
const STATUS_COLUMNS = ["todo", "in_progress", "review", "done"] as const;

type CreateForm = { title: string; description: string; priority: string; projectId: string };

export default function Tasks() {
  const [open, setOpen] = useState(false);
  const [params] = useSearchParams();
  const projectId = params.get("project") ? Number(params.get("project")) : undefined;

  const { data: tasksList = [], refetch } = trpc.projects.listTasks.useQuery(projectId ? { projectId } : undefined);
  const { data: projectsList = [] } = trpc.projects.list.useQuery();

  const createMutation = trpc.projects.createTask.useMutation({
    onSuccess: () => { toast.success("Uzdevums izveidots"); setOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.projects.updateTask.useMutation({ onSuccess: () => refetch() });

  const form = useForm<CreateForm>({ defaultValues: { priority: "medium", projectId: projectId?.toString() ?? "" } });

  const grouped = STATUS_COLUMNS.reduce((acc, s) => {
    acc[s] = tasksList.filter((t) => t.status === s);
    return acc;
  }, {} as Record<typeof STATUS_COLUMNS[number], typeof tasksList>);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-xl font-bold">Uzdevumi</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{tasksList.filter((t) => t.status !== "done").length} nepabeigti</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1.5" />Jauns uzdevums</Button>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 p-6 min-w-max h-full">
          {STATUS_COLUMNS.map((status) => (
            <div key={status} className="w-60 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{TASK_STATUS_LABELS[status]}</span>
                <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded-full">{grouped[status]?.length ?? 0}</span>
              </div>
              <div className="flex-1 space-y-2">
                {grouped[status]?.map((task) => (
                  <div key={task.id} className="border rounded-xl p-3 bg-card hover:border-primary/30 transition-colors shadow-sm">
                    <p className={`text-sm font-medium leading-snug ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs font-semibold ${PRIORITY_COLORS[task.priority ?? "medium"]}`}>●</span>
                      <span className="text-xs text-muted-foreground">{PRIORITY_LABELS[task.priority ?? "medium"]}</span>
                      {task.dueDate && <span className="text-xs text-muted-foreground ml-auto">{formatDate(task.dueDate)}</span>}
                    </div>
                    <Select
                      value={task.status ?? "todo"}
                      onValueChange={(s) => updateMutation.mutate({ id: task.id, status: s as "todo" | "in_progress" | "review" | "done" })}
                    >
                      <SelectTrigger className="h-6 text-[11px] mt-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_COLUMNS.map((s) => <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <button onClick={() => setOpen(true)} className="w-full text-xs text-muted-foreground border border-dashed rounded-lg p-2 hover:border-primary hover:text-primary transition-colors">
                  + Pievienot uzdevumu
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Jauns uzdevums</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((d) => createMutation.mutate({ ...d, projectId: Number(d.projectId), priority: d.priority as "low" | "medium" | "high" | "urgent" }))} className="space-y-4">
            <div className="space-y-1.5"><Label>Projekts *</Label>
              <Select onValueChange={(v) => form.setValue("projectId", v)} defaultValue={form.getValues("projectId")}>
                <SelectTrigger><SelectValue placeholder="Izvēlēties projektu..." /></SelectTrigger>
                <SelectContent>{projectsList.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Uzdevums *</Label>
              <Input {...form.register("title", { required: true })} placeholder="Ko vajag izdarīt?" />
            </div>
            <div className="space-y-1.5"><Label>Apraksts</Label><Textarea {...form.register("description")} rows={2} /></div>
            <div className="space-y-1.5"><Label>Prioritāte</Label>
              <Select onValueChange={(v) => form.setValue("priority", v)} defaultValue="medium">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Atcelt</Button>
              <Button type="submit" disabled={createMutation.isPending}>Izveidot</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
