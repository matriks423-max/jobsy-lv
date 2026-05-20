import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Search, Mail, Phone } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { initials } from "@/lib/utils";

type CreateForm = { name: string; email: string; phone: string; notes: string };

export default function Contacts() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: contactsList = [], refetch } = trpc.crm.listContacts.useQuery(search ? { search } : undefined);
  const createMutation = trpc.crm.createContact.useMutation({
    onSuccess: () => { toast.success("Kontakts pievienots"); setOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.crm.deleteContact.useMutation({
    onSuccess: () => { toast.success("Kontakts dzēsts"); refetch(); },
  });

  const form = useForm<CreateForm>();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Kontakti</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{contactsList.length} kontakti</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1.5" />Pievienot</Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Meklēt kontaktus..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b bg-muted/30">
            {["Vārds", "E-pasts", "Telefons", "Piezīmes", ""].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {contactsList.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">Nav kontaktu</td></tr>
            ) : contactsList.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{initials(c.name)}</div>
                    <span className="font-medium text-sm">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {c.email && <a href={`mailto:${c.email}`} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1.5"><Mail className="w-3 h-3" />{c.email}</a>}
                </td>
                <td className="px-4 py-3">
                  {c.phone && <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3" />{c.phone}</span>}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <span className="text-xs text-muted-foreground truncate block">{c.notes ?? "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => { if (confirm("Dzēst kontaktu?")) deleteMutation.mutate({ id: c.id }); }}>
                    Dzēst
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Jauns kontakts</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5"><Label>Vārds Uzvārds *</Label>
              <Input {...form.register("name", { required: true })} placeholder="Jānis Kalniņš" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>E-pasts</Label><Input {...form.register("email")} type="email" /></div>
              <div className="space-y-1.5"><Label>Telefons</Label><Input {...form.register("phone")} placeholder="+371 ..." /></div>
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
