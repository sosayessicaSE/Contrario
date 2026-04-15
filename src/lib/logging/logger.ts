type LogLevel = "debug" | "info" | "warn" | "error";

function levelEnabled(level: LogLevel): boolean {
  const env = (process.env.LOG_LEVEL ?? "info") as LogLevel;
  const order: LogLevel[] = ["debug", "info", "warn", "error"];
  return order.indexOf(level) >= order.indexOf(env);
}

export function logEvent(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {},
) {
  if (!levelEnabled(level)) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
