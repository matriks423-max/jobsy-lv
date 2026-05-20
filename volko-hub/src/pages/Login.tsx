import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type LoginForm = { email: string; password: string };
type RegisterForm = { email: string; name: string; password: string };

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: ({ token }) => {
      localStorage.setItem("volko_token", token);
      utils.invalidate();
      navigate("/");
    },
    onError: (e) => toast.error(e.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: ({ token }) => {
      localStorage.setItem("volko_token", token);
      utils.invalidate();
      navigate("/");
    },
    onError: (e) => toast.error(e.message),
  });

  const loginForm = useForm<LoginForm>();
  const registerForm = useForm<RegisterForm>();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-xl bg-primary items-center justify-center text-white font-bold text-xl mb-3">V</div>
          <h1 className="text-2xl font-bold">Volko Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">Volkoengineering iekšējā platforma</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{mode === "login" ? "Pierakstīties" : "Reģistrēties"}</CardTitle>
            <CardDescription>
              {mode === "login" ? "Ievadiet savus piekļuves datus" : "Izveidojiet jaunu kontu"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "login" ? (
              <form onSubmit={loginForm.handleSubmit((d) => loginMutation.mutate(d))} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>E-pasts</Label>
                  <Input {...loginForm.register("email", { required: true })} type="email" placeholder="janis@volkoengineering.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Parole</Label>
                  <Input {...loginForm.register("password", { required: true })} type="password" />
                </div>
                <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Lūdzu uzgaidiet..." : "Pierakstīties"}
                </Button>
              </form>
            ) : (
              <form onSubmit={registerForm.handleSubmit((d) => registerMutation.mutate(d))} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Vārds Uzvārds</Label>
                  <Input {...registerForm.register("name", { required: true })} placeholder="Jānis Kalniņš" />
                </div>
                <div className="space-y-1.5">
                  <Label>E-pasts</Label>
                  <Input {...registerForm.register("email", { required: true })} type="email" placeholder="janis@volkoengineering.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Parole</Label>
                  <Input {...registerForm.register("password", { required: true, minLength: 8 })} type="password" placeholder="Min. 8 rakstzīmes" />
                </div>
                <Button className="w-full" type="submit" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? "Lūdzu uzgaidiet..." : "Reģistrēties"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? "Nav konta?" : "Jau ir konts?"}{" "}
          <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-primary hover:underline font-medium">
            {mode === "login" ? "Reģistrēties" : "Pierakstīties"}
          </button>
        </p>
      </div>
    </div>
  );
}
