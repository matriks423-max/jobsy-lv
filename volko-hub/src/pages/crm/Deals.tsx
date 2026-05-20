import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { DEAL_STAGES, DEAL_STAGE_LABELS, type DealStage } from "../../../db/schema";

const STAGE_COLORS: Record<DealStage, string> = {
  lead: "bg-purple-50 border-purple-200 text-purple-700",
  qualified: "bg-blue-50 border-blue-200 text-blue-700",
  proposal: "bg-yellow-50 border-yellow-200 text-yellow-700",
  negotiation: "bg-red-50 border-red-200 text-red-700",
  won: "bg-green-50 border-green-200 text-green-700",
  lost: "bg-gray-50 border-gray-200 text-gray-500",
};

const STAGE_DOT: Record<DealStage, string> = {
  lead: "bg-purple-500",
  qualified: "bg-blue-500",
  proposal: "bg-yellow-500",
  negotiation: "bg-red-500",
  won: "bg-green-500",
  lost: "bg-gray-400",
};

type CreateForm = { title: string; value: string; currency: string; notes: string };

export default function Deals() {
  const [open, setOpen] = useState(false);
  const { data: deals = [], refetch } = trpc.crm.listDeals.useQuery();
  const createMutation = trpc.crm.createDeal.useMutation({
    onSuccess: () => { toast.success("Darījums izveidots"); setOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.crm.updateDeal.useMutation({ onSuccess: () => refetch() });

  const form = useForm<CreateForm>({ defaultValues: { currency: "EUR" } });

  const grouped = DEAL_STAGES.reduce((acc, stage) => {
    acc[stage] = deals.filter((d) => d.stage === stage);
    return acc;
  }, {} as Record<DealStage, typeof deals>);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-xl font-bold">Darījumu Pipeline</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {deals.filter((d) => !["won", "lost"].includes(d.stage ?? "")).length} aktīvi ·{" "}
            {formatCurrency(deals.filter((d) => !["won","lost"].includes(d.stage ?? "")).reduce((s, d) => s + Number(d.value ?? 0), 0))} kopā
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1.5" />Jauns darījums</Button>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 p-6 min-w-max h-full">
          {DEAL_STAGES.map((stage) => (
            <div key={stage} className="w-56 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2.5 h-2.5 rounded-full ${STAGE_DOT[stage]}`} />
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {DEAL_STAGE_LABELS[stage]}
                </span>
                <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded-full font-medium">{grouped[stage]?.length ?? 0}</span>
              </div>

              <div className="flex-1 space-y-2">
                {grouped[stage]?.map((deal) => (
                  <Card key={deal.id} className="cursor-pointer hover:-translate-y-0.5 transition-transform shadow-sm">
                    <CardContent className="p-3">
                      <p className="text-sm font-semibold leading-snug">{deal.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-bold text-primary">{formatCurrency(deal.value)}</span>
                        <Select
                          value={deal.stage ?? "lead"}
                          onValueChange={(s) => updateMutation.mutate({ id: deal.id, stage: s as DealStage })}
                        >
                          <SelectTrigger className={`h-5 text-[10px] w-auto px-1.5 border ${STAGE_COLORS[deal.stage as DealStage]}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{DEAL_STAGE_LABELS[s]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <button
                  onClick={() => setOpen(true)}
                  className="w-full text-xs text-muted-foreground border border-dashed rounded-lg p-2 hover:border-primary hover:text-primary transition-colors"
                >
                  + Pievienot darījumu
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Jauns darījums</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5"><Label>Nosaukums *</Label>
              <Input {...form.register("title", { required: true })} placeholder="Piemēram: Mājas lapa TechCorp" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Vērtība (€)</Label>
                <Input {...form.register("value")} type="number" placeholder="5000" />
              </div>
              <div className="space-y-1.5"><Label>Valūta</Label>
                <Input {...form.register("currency")} defaultValue="EUR" />
              </div>
            </div>
            <div className="space-y-1.5"><Label>Piezīmes</Label>
              <Textarea {...form.register("notes")} rows={3} />
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
