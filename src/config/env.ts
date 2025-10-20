const optional = (value: string | undefined | null): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

type NodeEnv = "development" | "test" | "production";

const envVarNames = {
  databaseUrl: "DATABASE_URL",
  sessionMaintenanceToken: "SESSION_MAINTENANCE_TOKEN",
  pinSessionSecret: "PIN_SESSION_SECRET",
} as const satisfies Record<string, string>;

const rawEnv = {
  databaseUrl: optional(process.env.DATABASE_URL),
  sessionMaintenanceToken: optional(process.env.SESSION_MAINTENANCE_TOKEN),
  pinSessionSecret: optional(process.env.PIN_SESSION_SECRET),
  nodeEnv: (process.env.NODE_ENV ?? "development") as NodeEnv,
} as const;

export const env = rawEnv;

export type Env = typeof env;

export type RequiredEnvKey = keyof Pick<
  Env,
  "databaseUrl" | "sessionMaintenanceToken"
>;

export function requireEnv(key: RequiredEnvKey): string {
  const value = rawEnv[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${envVarNames[key]}`);
  }
  return value;
}
