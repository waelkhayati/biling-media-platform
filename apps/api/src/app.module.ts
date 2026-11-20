import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { AppConfigModule } from "./config/config.module";
import { ContentModule } from "./content/content.module";
import { PrismaModule } from "./database/prisma.module";
import { HealthModule } from "./health/health.module";
import { AdminModule } from "./admin/admin.module";
import { ArticleModule } from "./articles/article.module";
import { AudienceModule } from "./audience/audience.module";
import { CommunityModule } from "./community/community.module";

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    HealthModule,
    ContentModule,
    AdminModule,
    ArticleModule,
    AudienceModule,
    CommunityModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
