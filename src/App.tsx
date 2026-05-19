import { Routes, Route } from "react-router";
import { Toaster } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import PostDetail from "./pages/PostDetail";
import CreatePost from "./pages/CreatePost";
import MyPosts from "./pages/MyPosts";
import Success from "./pages/Success";
import Payment from "./pages/Payment";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1A1A1A",
            color: "#F5F1E8",
            border: "2px solid #1A1A1A",
            borderRadius: "12px",
          },
        }}
      />
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
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
