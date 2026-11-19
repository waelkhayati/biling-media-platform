import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { ArticleController, StudioArticleController } from "./article.controller";
import { ArticleService } from "./article.service";

@Module({
  imports: [AdminModule],
  controllers: [ArticleController, StudioArticleController],
  providers: [ArticleService],
})
export class ArticleModule {}
