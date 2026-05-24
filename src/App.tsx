import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/lib/theme-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import CookieBanner from "@/components/CookieBanner";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import ScrollToTop from "@/components/ScrollToTop";
// Critical pages — eager loaded
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import PostDetail from "./pages/PostDetail";
// Non-critical pages — lazy loaded for smaller initial bundle
const CreatePost = lazy(() => import("./pages/CreatePost"));
const MyPosts = lazy(() => import("./pages/MyPosts"));
const Success = lazy(() => import("./pages/Success"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Login = lazy(() => import("./pages/Login"));
const Settings = lazy(() => import("./pages/Settings"));
const Category = lazy(() => import("./pages/Category"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const StylePreview = lazy(() => import("./pages/StylePreview"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const UserProfile = lazy(() => import("./pages/UserProfile"));

function AdminRoute({ element }: { element: React.ReactElement }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated || user?.role !== "admin") return <Navigate to="/" replace />;
  return element;
}

export default function App() {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col">
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--ink)",
              color: "var(--cream)",
              border: "2px solid var(--ink)",
              borderRadius: "12px",
            },
          }}
        />
        <ScrollToTop />
        <Navbar />
        <main className="flex-1">
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/post/:id" element={<PostDetail />} />
              <Route path="/create" element={<CreatePost />} />
              <Route path="/edit/:id" element={<CreatePost />} />
              <Route path="/my-posts" element={<MyPosts />} />
              <Route path="/success" element={<Success />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/kategorija/:slug" element={<Category />} />
              <Route path="/admin" element={<AdminRoute element={<Admin />} />} />
              <Route path="/user/:id" element={<UserProfile />} />
              <Route path="/style-preview" element={<AdminRoute element={<StylePreview />} />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        <BackToTop />
        <CookieBanner />
        <PWAInstallPrompt />
      </div>
    </ThemeProvider>
  );
}
