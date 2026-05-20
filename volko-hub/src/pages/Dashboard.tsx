import { Link } from "react-router";
import { TrendingUp, FolderOpen, CheckSquare, Users, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DEAL_STAGE_LABELS, TASK_STATUS_LABELS } from "../../db/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: deals = [] } = trpc.crm.listDeals.useQuery();
  const { data: projectsList = [] } = trpc.projects.list.useQuery();
  const { data: tasksList = [] } = trpc.projects.listTasks.useQuery();
  const { data: contactsList = [] } = trpc.crm.listContacts.useQuery();

  const activeDeals = deals.filter((d) => !["won", "lost"].includes(d.stage ?? ""));
  const pipelineValue = activeDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const pendingTasks = tasksList.filter((t) => t.status !== "done");
  const myTasks = tasksList.filter((t) => t.assigneeId === user?.id && t.status !== "done");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Labdien, {user?.name?.split(" ")[0]}! 👋</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Šeit ir jūsu darba kopsavilkums</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Aktīvie darījumi", value: activeDeals.length, sub: `Pipeline €${Math.round(pipelineValue / 1000)}k`, icon: TrendingUp, color: "text-primary bg-primary/10" },
          { label: "Kontakti", value: contactsList.length, sub: "Klienti un potenciālie", icon: Users, color: "text-green-600 bg-green-50" },
          { label: "Aktīvie projekti", value: projectsList.filter((p) => p.status === "active").length, sub: `${projectsList.length} kopā`, icon: FolderOpen, color: "text-orange-500 bg-orange-50" },
          { label: "Mani uzdevumi", value: myTasks.length, sub: `${pendingTasks.length} nepabeigti kopā`, icon: CheckSquare, color: "text-red-500 bg-red-50" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active deals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="text-sm font-semibold">Aktīvie darījumi</CardTitle>
            <Link to="/crm/deals"><Button variant="ghost" size="sm" className="text-xs h-7">Visi <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>
          </CardHeader>
          <CardContent className="pt-0">
            {activeDeals.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Nav aktīvu darījumu</p>
            ) : (
              <div className="space-y-2">
                {activeDeals.slice(0, 5).map((deal) => (
                  <Link key={deal.id} to="/crm/deals" className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{deal.title}</p>
                      <Badge variant="outline" className="text-[10px] mt-0.5">{DEAL_STAGE_LABELS[deal.stage!]}</Badge>
                    </div>
                    <span className="text-sm font-bold text-primary">{formatCurrency(deal.value)}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="text-sm font-semibold">Mani uzdevumi</CardTitle>
            <Link to="/tasks"><Button variant="ghost" size="sm" className="text-xs h-7">Visi <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>
          </CardHeader>
          <CardContent className="pt-0">
            {myTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Nav nepabeigtu uzdevumu 🎉</p>
            ) : (
              <div className="divide-y">
                {myTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-start gap-3 py-2.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      task.priority === "urgent" ? "bg-red-500" : task.priority === "high" ? "bg-orange-500" : task.priority === "medium" ? "bg-yellow-500" : "bg-slate-300"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {TASK_STATUS_LABELS[task.status!]}
                        {task.dueDate && ` · ${formatDate(task.dueDate)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick AI access */}
      <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">🤖 Claude AI Asistents</p>
              <p className="text-xs text-muted-foreground mt-0.5">Jautājiet par klientiem, projektiem, uzdevumiem un failiem</p>
            </div>
            <Link to="/ai">
              <Button size="sm" className="bg-primary hover:bg-primary/90">Atvērt čatu <ArrowRight className="w-3 h-3 ml-1.5" /></Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
