import { NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard, Users, Building2, TrendingUp, FolderOpen,
  CheckSquare, Bot, Link2, Settings, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { label: "Dividers", type: "divider", section: "CRM" },
  { label: "Kontakti", icon: Users, to: "/crm/contacts" },
  { label: "Uzņēmumi", icon: Building2, to: "/crm/companies" },
  { label: "Darījumi", icon: TrendingUp, to: "/crm/deals", badge: true },
  { label: "Dividers", type: "divider", section: "Projekti" },
  { label: "Projekti", icon: FolderOpen, to: "/projects" },
  { label: "Uzdevumi", icon: CheckSquare, to: "/tasks", badge: true },
  { label: "Dividers", type: "divider", section: "Rīki" },
  { label: "Claude AI", icon: Bot, to: "/ai", highlight: true },
  { label: "Integrācijas", icon: Link2, to: "/integrations" },
];

export default function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  function logout() {
    localStorage.removeItem("volko_token");
    utils.invalidate();
    navigate("/login");
  }

  return (
    <aside className="w-60 min-w-60 bg-sidebar flex flex-col border-r border-sidebar-border h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">V</div>
        <div>
          <div className="text-white font-bold text-sm leading-tight">Volko Hub</div>
          <div className="text-sidebar-foreground text-xs">Volkoengineering.com</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map((item, i) => {
          if ("type" in item && item.type === "divider") {
            return (
              <div key={i} className="pt-3 pb-1">
                <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/50">
                  {item.section}
                </span>
              </div>
            );
          }
          if (!("to" in item)) return null;
          return (
            <NavLink
              key={item.to}
              to={item.to!}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-white"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white",
                  item.highlight && "text-primary hover:text-primary"
                )
              }
            >
              {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
              <span className="flex-1">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-2 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn("flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors",
              isActive ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white")
          }
        >
          <Settings className="w-4 h-4" />
          Iestatījumi
        </NavLink>

        {user && (
          <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials(user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{user.name}</div>
              <div className="text-sidebar-foreground text-[10px] capitalize">{user.role}</div>
            </div>
            <button onClick={logout} className="text-sidebar-foreground hover:text-white transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
