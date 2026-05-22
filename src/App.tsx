import { Routes, Route } from "react-router";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/lib/theme-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import CookieBanner from "@/components/CookieBanner";
import ScrollToTop from "@/components/ScrollToTop";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import PostDetail from "./pages/PostDetail";
import CreatePost from "./pages/CreatePost";
import MyPosts from "./pages/MyPosts";
import Success from "./pages/Success";
import Payment from "./pages/Payment";
import Pricing from "./pages/Pricing";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import Category from "./pages/Category";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import StylePreview from "./pages/StylePreview";

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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/edit/:id" element={<CreatePost />} />
            <Route path="/my-posts" element={<MyPosts />} />
            <Route path="/success" element={<Success />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/login" element={<Login />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/kategorija/:slug" element={<Category />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/style-preview" element={<StylePreview />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
        <BackToTop />
        <CookieBanner />
      </div>
    </ThemeProvider>
  );
}
