import { z } from "zod";

const server = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_API_BASE_URL: z.string().url().optional().or(z.literal("")),
  SUMMARIZE_MODEL: z.string().default("gpt-4o-mini"),
  MOCK_AI: z
    .enum(["0", "1"])
    .optional()
    .transform((v) => v === "1"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const client = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof server> & { DATABASE_URL: string };

export function getServerEnv(): ServerEnv {
  const parsed = server.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    LLM_API_KEY: process.env.LLM_API_KEY,
    LLM_API_BASE_URL: process.env.LLM_API_BASE_URL ?? "",
    SUMMARIZE_MODEL: process.env.SUMMARIZE_MODEL,
    MOCK_AI: process.env.MOCK_AI ?? "0",
    LOG_LEVEL: process.env.LOG_LEVEL,
  });
  if (!parsed.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  return parsed as ServerEnv;
}

export function getClientEnv() {
  return client.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
}
