export interface AppConfiguration {
  DATABASE_URL: string;
  PORT: number;
  CORS_ORIGIN: string;
  NODE_ENV: "development" | "test" | "production";
}

export const APP_CONFIGURATION = Symbol("APP_CONFIGURATION");
