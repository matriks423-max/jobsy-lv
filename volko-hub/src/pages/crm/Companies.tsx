import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Search, Globe } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { initials } from "@/lib/utils";

type CreateForm = { name: string; website: string; industry: string; notes: string };

export default function Companies() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: companiesList = [], refetch } = trpc.crm.listCompanies.useQuery(search ? { search } : undefined);
  const createMutation = trpc.crm.createCompany.useMutation({
    onSuccess: () => { toast.success("Uzņēmums pievienots"); setOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const form = useForm<CreateForm>();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Uzņēmumi</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{companiesList.length} uzņēmumi</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1.5" />Pievienot</Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Meklēt uzņēmumus..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {companiesList.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground text-sm">Nav uzņēmumu</div>
        ) : companiesList.map((c) => (
          <div key={c.id} className="border rounded-xl p-4 bg-card hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">{initials(c.name)}</div>
              <div>
                <p className="font-semibold text-sm">{c.name}</p>
                {c.industry && <p className="text-xs text-muted-foreground">{c.industry}</p>}
              </div>
            </div>
            {c.website && (
              <a href={c.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                <Globe className="w-3 h-3" />{c.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {c.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.notes}</p>}
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Jauns uzņēmums</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5"><Label>Nosaukums *</Label><Input {...form.register("name", { required: true })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Mājas lapa</Label><Input {...form.register("website")} placeholder="https://..." /></div>
              <div className="space-y-1.5"><Label>Nozare</Label><Input {...form.register("industry")} placeholder="IT, Tirdzniecība..." /></div>
            </div>
            <div className="space-y-1.5"><Label>Piezīmes</Label><Textarea {...form.register("notes")} rows={3} /></div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Atcelt</Button>
              <Button type="submit" disabled={createMutation.isPending}>Pievienot</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
