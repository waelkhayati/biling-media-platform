import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  articleInputSchema,
  articleQuerySchema,
  articleRequestDocs,
  articleUpdateSchema,
  contentSlugSchema,
  staffContentIdSchema,
  studioArticleQuerySchema,
} from "@biling/schemas";
import type { ApiBodyOptions } from "@nestjs/swagger";
import { StaffGuard, type StaffRequest } from "../admin/staff.guard";
import { validate } from "../common/validate";
import { ArticleService } from "./article.service";

@ApiTags("Articles")
@Controller("articles")
export class ArticleController {
  constructor(@Inject(ArticleService) private readonly articles: ArticleService) {}

  @Get()
  @ApiOperation({ summary: "List published articles, newest first" })
  @ApiQuery({ name: "category", required: false, type: String })
  @ApiQuery({ name: "tag", required: false, type: String })
  @ApiQuery({ name: "show", required: false, type: String })
  @ApiQuery({ name: "episode", required: false, type: String })
  @ApiQuery({ name: "featured", required: false, enum: ["true"] })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 400, description: "Invalid filters." })
  list(@Query() query: unknown) {
    return this.articles.list(validate(articleQuerySchema, query));
  }

  @Get("sitemap")
  @ApiOperation({ summary: "List published article URLs and modification dates" })
  sitemap() {
    return this.articles.sitemap();
  }

  @Get(":slug")
  @ApiOperation({ summary: "Read a published article, its related articles and productions" })
  @ApiResponse({ status: 404, description: "Published article not found." })
  detail(@Param("slug") slug: string) {
    return this.articles.detail(validate(contentSlugSchema, slug));
  }
}

@ApiTags("Admin Studio Articles")
@ApiBearerAuth("staff")
@ApiResponse({ status: 401, description: "Staff session required." })
@ApiResponse({
  status: 403,
  description: "Archiving and editing archived articles require an administrator.",
})
@UseGuards(StaffGuard)
@Controller("admin")
export class StudioArticleController {
  constructor(@Inject(ArticleService) private readonly articles: ArticleService) {}

  @Get("articles")
  @ApiOperation({ summary: "List articles across all publication states" })
  @ApiQuery({ name: "status", required: false, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] })
  @ApiQuery({ name: "category", required: false, type: String })
  @ApiQuery({ name: "author", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  list(@Query() query: unknown) {
    return this.articles.studioList(validate(studioArticleQuerySchema, query));
  }

  @Get("article-options")
  @ApiOperation({ summary: "List shows and episodes available for article associations" })
  options() {
    return this.articles.options();
  }

  @Get("articles/:id")
  @ApiOperation({ summary: "Read an article in any state for editing or preview" })
  detail(@Param("id") id: string) {
    return this.articles.studioDetail(validate(staffContentIdSchema, id));
  }

  @Post("articles")
  @ApiOperation({ summary: "Create an editorial article" })
  @ApiBody({ schema: articleRequestDocs.create } as ApiBodyOptions)
  create(@Body() body: unknown, @Req() request: StaffRequest) {
    return this.articles.create(validate(articleInputSchema, body), request.staff);
  }

  @Patch("articles/:id")
  @ApiOperation({ summary: "Update an article using its current revision" })
  @ApiBody({ schema: articleRequestDocs.update } as ApiBodyOptions)
  @ApiResponse({ status: 409, description: "Duplicate or locked slug, or stale revision." })
  update(@Param("id") id: string, @Body() body: unknown, @Req() request: StaffRequest) {
    return this.articles.update(
      validate(staffContentIdSchema, id),
      validate(articleUpdateSchema, body),
      request.staff,
    );
  }
}
