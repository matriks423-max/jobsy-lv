export type * from "../db/schema";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: "admin" | "member";
  avatar: string | null;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: "admin" | "member";
}

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallRecord[];
  createdAt: string;
}

export interface ToolCallRecord {
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
}

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 400,
  ) {
    super(message);
  }
}
