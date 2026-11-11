import { Global, Module } from "@nestjs/common";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import Joi from "joi";
import { APP_CONFIGURATION, type AppConfiguration } from "./config.types";
import { AppConfigService } from "./config.service";

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv({ path: resolve(process.cwd(), ".env") });

function loadConfiguration(): AppConfiguration {
  const { error, value } = Joi.object({
    DATABASE_URL: Joi.string()
      .uri({ scheme: ["postgres", "postgresql"] })
      .required(),
    PORT: Joi.number().port().default(3001),
    CORS_ORIGIN: Joi.string().default("http://localhost:3000"),
    NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  })
    .unknown(true)
    .validate(process.env, { abortEarly: false, convert: true });

  if (error) {
    throw new Error(`Invalid environment configuration: ${error.message}`);
  }

  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid environment configuration.");
  }

  const configuration = value as Record<string, unknown>;
  const { DATABASE_URL, PORT, CORS_ORIGIN, NODE_ENV } = configuration;

  if (
    typeof DATABASE_URL !== "string" ||
    typeof PORT !== "number" ||
    typeof CORS_ORIGIN !== "string" ||
    (NODE_ENV !== "development" && NODE_ENV !== "test" && NODE_ENV !== "production")
  ) {
    throw new Error("Invalid environment configuration.");
  }

  return { DATABASE_URL, PORT, CORS_ORIGIN, NODE_ENV };
}

@Global()
@Module({
  providers: [{ provide: APP_CONFIGURATION, useFactory: loadConfiguration }, AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
