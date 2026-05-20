import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { initials, formatDate } from "@/lib/utils";

export default function Settings() {
  const { user } = useAuth();
  const { data: usersList = [] } = trpc.auth.listUsers.useQuery();

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">Iestatījumi</h1>

      {/* My profile */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Mans profils</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center">
              {user ? initials(user.name) : "?"}
            </div>
            <div>
              <p className="font-semibold">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge className="mt-1 capitalize" variant="outline">{user?.role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Komanda ({usersList.length} locekļi)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {usersList.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  {initials(u.name)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Badge variant="outline" className="capitalize text-xs">{u.role}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Par Volko Hub</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>🏢 Izstrādāts Volkoengineering.com iekšējai lietošanai</p>
            <p>🤖 Claude AI: claude-sonnet-4-6</p>
            <p>⚡ Stack: React 19 + Hono + tRPC + MySQL + Drizzle ORM</p>
            <p>💰 Aizstāj: Pipedrive + Teamwork (ietaupījums ~€150/mēn)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
