import { Routes, Route, Navigate } from "react-router";
import { Toaster } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Contacts from "@/pages/crm/Contacts";
import Companies from "@/pages/crm/Companies";
import Deals from "@/pages/crm/Deals";
import Projects from "@/pages/projects/Projects";
import Tasks from "@/pages/projects/Tasks";
import AI from "@/pages/AI";
import Integrations from "@/pages/Integrations";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";

function ProtectedLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crm/contacts" element={<Contacts />} />
          <Route path="/crm/companies" element={<Companies />} />
          <Route path="/crm/deals" element={<Deals />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/ai" element={<AI />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Toaster position="bottom-right" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </>
  );
}
