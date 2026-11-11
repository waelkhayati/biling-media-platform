import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { AppConfigModule } from "./config/config.module";
import { ContentModule } from "./content/content.module";
import { PrismaModule } from "./database/prisma.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [AppConfigModule, PrismaModule, HealthModule, ContentModule],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
