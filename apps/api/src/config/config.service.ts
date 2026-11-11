import { Inject, Injectable } from "@nestjs/common";
import { APP_CONFIGURATION, type AppConfiguration } from "./config.types";

@Injectable()
export class AppConfigService {
  constructor(
    @Inject(APP_CONFIGURATION)
    private readonly configuration: AppConfiguration,
  ) {}

  get<Key extends keyof AppConfiguration>(key: Key): AppConfiguration[Key] {
    return this.configuration[key];
  }

  getOrThrow<Key extends keyof AppConfiguration>(key: Key): AppConfiguration[Key] {
    const value = this.configuration[key];

    if (value === undefined || value === null) {
      throw new Error(`Missing required configuration: ${String(key)}`);
    }

    return value;
  }
}
