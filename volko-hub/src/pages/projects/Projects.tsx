import { useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, FolderOpen } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = { active: "Aktīvs", on_hold: "Apturēts", completed: "Pabeigts", archived: "Arhīvs" };
const STATUS_COLORS: Record<string, string> = { active: "bg-green-50 text-green-700", on_hold: "bg-yellow-50 text-yellow-700", completed: "bg-blue-50 text-blue-700", archived: "bg-gray-50 text-gray-500" };

type CreateForm = { title: string; description: string; color: string };

export default function Projects() {
  const [open, setOpen] = useState(false);
  const { data: projectsList = [], refetch } = trpc.projects.list.useQuery();
  const { data: tasksList = [] } = trpc.projects.listTasks.useQuery();
  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => { toast.success("Projekts izveidots"); setOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const form = useForm<CreateForm>({ defaultValues: { color: "#6366f1" } });

  const getProgress = (projectId: number) => {
    const projectTasks = tasksList.filter((t) => t.projectId === projectId);
    if (!projectTasks.length) return 0;
    const done = projectTasks.filter((t) => t.status === "done").length;
    return Math.round((done / projectTasks.length) * 100);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Projekti</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{projectsList.length} projekti</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1.5" />Jauns projekts</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectsList.length === 0 ? (
          <div className="col-span-3 flex flex-col items-center py-16 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mb-3 opacity-20" />
            <p>Nav projektu. Izveidojiet pirmo!</p>
          </div>
        ) : projectsList.map((p) => {
          const progress = getProgress(p.id);
          const projectTasks = tasksList.filter((t) => t.projectId === p.id);
          return (
            <Link key={p.id} to={`/tasks?project=${p.id}`} className="block">
              <div className="border rounded-xl p-4 bg-card hover:border-primary/40 transition-colors" style={{ borderTopColor: p.color ?? "#6366f1", borderTopWidth: 3 }}>
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-sm leading-tight">{p.title}</p>
                  <Badge className={`text-[10px] ml-2 ${STATUS_COLORS[p.status ?? "active"]}`} variant="outline">
                    {STATUS_LABELS[p.status ?? "active"]}
                  </Badge>
                </div>
                {p.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>}
                {p.dueDate && <p className="text-xs text-muted-foreground mb-2">📅 Termiņš: {formatDate(p.dueDate)}</p>}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1">
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: p.color ?? "#6366f1" }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{progress}% pabeigts</span>
                  <span>{projectTasks.filter((t) => t.status === "done").length}/{projectTasks.length} uzdevumi</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Jauns projekts</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5"><Label>Nosaukums *</Label>
              <Input {...form.register("title", { required: true })} placeholder="Piemēram: TechCorp mājas lapa" />
            </div>
            <div className="space-y-1.5"><Label>Apraksts</Label><Textarea {...form.register("description")} rows={3} /></div>
            <div className="space-y-1.5">
              <Label>Krāsa</Label>
              <input {...form.register("color")} type="color" className="h-9 w-full cursor-pointer rounded border border-input" />
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
