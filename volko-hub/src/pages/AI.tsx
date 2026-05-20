import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Send, Plus, Bot, Wrench } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/utils";

const HINTS = [
  "Parādi aktīvos darījumus",
  "Kādi uzdevumi man šodien?",
  "Sagatavo e-pastu klientam",
  "Projektu statuss",
  "Atrast failu OneDrive",
];

type Message = { role: "user" | "assistant"; content: string };

export default function AI() {
  const { user } = useAuth();
  const [convId, setConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: convList = [], refetch: refetchList } = trpc.claude.listConversations.useQuery();
  const { data: currentConv } = trpc.claude.getConversation.useQuery({ id: convId! }, { enabled: !!convId });

  const createConvMutation = trpc.claude.createConversation.useMutation({
    onSuccess: ({ id }) => { setConvId(id); setMessages([]); refetchList(); },
  });

  const chatMutation = trpc.claude.chat.useMutation({
    onSuccess: ({ reply }) => {
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      setIsThinking(false);
      refetchList();
    },
    onError: (e) => { toast.error(e.message); setIsThinking(false); },
  });

  trpc.claude.deleteConversation.useMutation({
    onSuccess: () => { setConvId(null); setMessages([]); refetchList(); },
  });

  useEffect(() => {
    if (currentConv?.messages) {
      setMessages(currentConv.messages as Message[]);
    }
  }, [currentConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  async function startNewConv() {
    createConvMutation.mutate();
  }

  async function sendMessage(text?: string) {
    const msg = text ?? input.trim();
    if (!msg) return;

    let activeConvId = convId;
    if (!activeConvId) {
      const result = await createConvMutation.mutateAsync();
      activeConvId = result.id;
    }

    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setIsThinking(true);
    chatMutation.mutate({ conversationId: activeConvId, message: msg });
  }

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Conversations sidebar */}
      <div className="w-56 border-r flex flex-col bg-card">
        <div className="p-3 border-b">
          <Button onClick={startNewConv} size="sm" className="w-full" variant="outline">
            <Plus className="w-3.5 h-3.5 mr-1.5" />Jauna saruna
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1">Vēsture</p>
          {convList.map((c) => (
            <button
              key={c.id}
              onClick={() => setConvId(c.id)}
              className={cn("w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors group", convId === c.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground")}
            >
              <span className="line-clamp-2 leading-relaxed">{c.title ?? "Saruna"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b bg-card">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white flex-shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">Claude AI Asistents</p>
            <p className="text-[11px] text-muted-foreground">Piekļuve: CRM · Projekti · Outlook · OneDrive</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full pb-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white mb-4">
                <Bot className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold mb-1">Kā varu palīdzēt?</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">Es esmu jūsu Volkoengineering asistents. Varu palīdzēt ar klientiem, projektiem, uzdevumiem un dokumentiem.</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {HINTS.map((h) => (
                  <button key={h} onClick={() => sendMessage(h)} className="px-3 py-1.5 rounded-full border text-xs hover:border-primary hover:text-primary transition-colors bg-card">
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-3 max-w-[85%]", msg.role === "user" && "ml-auto flex-row-reverse")}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0", msg.role === "assistant" ? "bg-gradient-to-br from-primary to-purple-500 text-white" : "bg-foreground text-background")}>
                {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : (user ? initials(user.name) : "?")}
              </div>
              <div className={cn("px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                msg.role === "assistant" ? "bg-card border rounded-tl-none" : "bg-primary text-primary-foreground rounded-tr-none")}>
                {msg.content}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-card border rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Wrench className="w-3.5 h-3.5 animate-pulse" />
                <span>Claude domā un meklē datus...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t bg-card">
          {messages.length === 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {HINTS.map((h) => (
                <button key={h} onClick={() => sendMessage(h)} className="px-2.5 py-1 rounded-full border text-xs hover:border-primary hover:text-primary transition-colors">
                  {h}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end bg-muted/50 border rounded-xl p-2.5">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Jautājiet Claude par klientiem, projektiem, uzdevumiem..."
              className="flex-1 border-0 bg-transparent resize-none text-sm min-h-[36px] max-h-32 focus-visible:ring-0 p-0"
              rows={1}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isThinking}
              size="sm"
              className="h-9 w-9 p-0 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">Enter = nosūtīt · Shift+Enter = jauna rinda</p>
        </div>
      </div>
    </div>
  );
}
