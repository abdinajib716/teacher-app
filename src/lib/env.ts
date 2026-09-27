import { z } from "zod"

/**
 * Environment validation, checked once when the server boots (see
 * `src/instrumentation.ts`). Catches the half-done configurations that would
 * otherwise fail silently and late. Set SKIP_ENV_VALIDATION="true" to bypass.
 */

// `.env.example` ships unused variables as `VAR=""`: blank means unset.
const blankAsUnset = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema)

const optional = blankAsUnset(z.string().min(1).optional())

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).optional(),
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required")
      .refine((v) => /^postgres(ql)?:\/\//.test(v), {
        message: "DATABASE_URL should be a postgres connection string (postgresql://...)",
      }),
    AUTH_SECRET: optional,
    NEXT_PUBLIC_APP_URL: optional,
    NEXT_PUBLIC_APP_NAME: optional,
    RESEND_API_KEY: blankAsUnset(
      z
        .string()
        .refine((v) => v.startsWith("re_"), { message: 'RESEND_API_KEY should start with "re_"' })
        .optional()
    ),
    EMAIL_FROM: optional,
  })
  .superRefine((env, ctx) => {
    if (env.RESEND_API_KEY && !env.EMAIL_FROM) {
      ctx.addIssue({
        code: "custom",
        path: ["EMAIL_FROM"],
        message: "EMAIL_FROM is required when RESEND_API_KEY is set: every email would fail without a sender",
      })
    }
    if (env.NODE_ENV === "production" && !env.AUTH_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_SECRET"],
        message: "AUTH_SECRET is required in production",
      })
    }
  })

export type Env = z.infer<typeof envSchema>

type EnvSource = Record<string, string | undefined>

export function parseEnv(source: EnvSource = process.env): Env {
  const result = envSchema.safeParse(source)
  if (result.success) return result.data
  const lines = result.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
  throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`)
}

export function validateEnv(source: EnvSource = process.env): void {
  if (source.SKIP_ENV_VALIDATION === "true") return
  parseEnv(source)
}

/** Whether transactional email (reset links, PDF receipts) can be sent. */
export const hasEmail = () => Boolean(process.env.RESEND_API_KEY)
