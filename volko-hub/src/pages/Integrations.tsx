import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Integrations() {
  const [params] = useSearchParams();
  const successParam = params.get("success");
  const errorParam = params.get("error");

  const { data: integrationsList = [], refetch } = trpc.integrations.list.useQuery();
  const { data: msAuthUrl } = trpc.integrations.getMicrosoftAuthUrl.useQuery();
  const disconnectMutation = trpc.integrations.disconnect.useMutation({
    onSuccess: () => { toast.success("Integrācija atvienota"); refetch(); },
  });
  const saveWhatsApp = trpc.integrations.saveWhatsApp.useMutation({
    onSuccess: () => { toast.success("WhatsApp savienots"); setWaOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [waOpen, setWaOpen] = useState(false);
  const [waToken, setWaToken] = useState("");
  const [waPhoneId, setWaPhoneId] = useState("");

  const msIntegration = integrationsList.find((i) => i.service === "microsoft");
  const waIntegration = integrationsList.find((i) => i.service === "whatsapp");

  const iCards = [
    {
      key: "microsoft" as const,
      name: "Microsoft Outlook + OneDrive",
      icon: "📧☁️",
      description: "E-pasti, kalendārs un OneDrive faili — visi vienā OAuth savienojumā.",
      features: ["Lasīt e-pastus", "Sūtīt e-pastus", "OneDrive failu meklēšana", "Kalendāra notikumi"],
      connected: !!msIntegration,
      meta: (msIntegration?.metadata as { email?: string })?.email,
      onConnect: () => { if (msAuthUrl?.url) window.location.href = msAuthUrl.url; },
      onDisconnect: () => disconnectMutation.mutate({ service: "microsoft" }),
    },
    {
      key: "whatsapp" as const,
      name: "WhatsApp Business",
      icon: "💬",
      description: "Saziņa ar klientiem caur WhatsApp Business API.",
      features: ["Lasīt ziņojumus", "Sūtīt ziņojumus", "Klientu saraksts"],
      connected: !!waIntegration,
      meta: undefined,
      onConnect: () => setWaOpen(true),
      onDisconnect: () => disconnectMutation.mutate({ service: "whatsapp" }),
    },
  ];

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Integrācijas</h1>
        <p className="text-sm text-muted-foreground mt-1">Savienojiet savus rīkus lai Claude varētu piekļūt visiem datiem.</p>
      </div>

      {successParam && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4 text-sm text-green-700">
          <CheckCircle className="w-4 h-4" />
          Microsoft savienots veiksmīgi!
        </div>
      )}
      {errorParam && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-700">
          <XCircle className="w-4 h-4" />
          Savienojums neizdevās: {errorParam}
        </div>
      )}

      <div className="space-y-4">
        {iCards.map((card) => (
          <Card key={card.key}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="text-3xl leading-none mt-0.5">{card.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-sm">{card.name}</h3>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${card.connected ? "text-green-600" : "text-muted-foreground"}`}>
                      <div className={`w-2 h-2 rounded-full ${card.connected ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                      {card.connected ? "Savienots" : "Nav savienots"}
                    </div>
                  </div>
                  {card.meta && <p className="text-xs text-muted-foreground mb-2">{card.meta}</p>}
                  <p className="text-xs text-muted-foreground mb-3">{card.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {card.features.map((f) => (
                      <span key={f} className={`text-[11px] px-2 py-0.5 rounded-full ${card.connected ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"}`}>
                        {card.connected ? "✓" : "○"} {f}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {card.connected ? (
                      <Button variant="outline" size="sm" onClick={card.onDisconnect} disabled={disconnectMutation.isPending}>
                        Atvienot
                      </Button>
                    ) : (
                      <Button size="sm" onClick={card.onConnect}>
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />Savienot
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Claude AI status */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="text-3xl leading-none mt-0.5">🤖</div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-sm">Claude AI (Anthropic)</h3>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Aktīvs
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Model: claude-sonnet-4-6 · Prompt caching ieslēgts (ietaupa API izmaksas)</p>
                <p className="text-xs text-muted-foreground">ANTHROPIC_API_KEY konfigurēts .env failā</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Savienot WhatsApp Business</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Nepieciešams WhatsApp Business API konts. Iegūstiet credentials no Meta Developer portāla.</p>
            <div className="space-y-1.5">
              <Label>API Token</Label>
              <Input value={waToken} onChange={(e) => setWaToken(e.target.value)} placeholder="EAABs..." />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number ID</Label>
              <Input value={waPhoneId} onChange={(e) => setWaPhoneId(e.target.value)} placeholder="123456789..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setWaOpen(false)}>Atcelt</Button>
              <Button onClick={() => saveWhatsApp.mutate({ apiToken: waToken, phoneId: waPhoneId })} disabled={!waToken || !waPhoneId || saveWhatsApp.isPending}>
                Saglabāt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
