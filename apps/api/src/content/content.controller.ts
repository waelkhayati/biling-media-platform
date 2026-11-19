import { BadRequestException, Controller, Get, Inject, Param, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import type {
  ContentSearchResults,
  PublishedEpisodeDetail,
  PublishedEpisodeSummary,
  PublishedShowDetail,
  PublishedShowSummary,
} from "@biling/contracts";
import {
  contentSearchQuerySchema,
  contentSlugSchema,
  publishedShowFiltersSchema,
} from "@biling/schemas";
import { ContentService } from "./content.service";

function validateSlug(value: string) {
  if (!contentSlugSchema.safeParse(value).success) {
    throw new BadRequestException("Invalid content slug");
  }
  return value;
}

@ApiTags("content")
@Controller()
export class ContentController {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  @Get("shows")
  @ApiOperation({ summary: "List published shows for public discovery" })
  @ApiQuery({ name: "q", required: false, description: "Match show title or description." })
  @ApiQuery({ name: "featured", required: false, enum: ["true", "false"] })
  @ApiQuery({ name: "limit", required: false, description: "Limit the list to 1 to 24 shows." })
  @ApiOkResponse({ description: "Published shows, with their latest published episode." })
  async getPublishedShows(@Query() query: unknown): Promise<{ items: PublishedShowSummary[] }> {
    const filters = publishedShowFiltersSchema.safeParse(query);
    if (!filters.success) throw new BadRequestException("Invalid production directory filters");
    return { items: await this.content.findPublishedShows(filters.data) };
  }

  @Get("search")
  @ApiOperation({
    summary: "Search published shows, episodes and articles by title or description",
  })
  @ApiQuery({ name: "q", required: true, description: "Search text (2 to 100 characters)." })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Results per group (1 to 24, default 12).",
  })
  @ApiOkResponse({
    description: "Matching shows, episodes and articles grouped by type, with limit indicators.",
  })
  @ApiBadRequestResponse({ description: "Invalid search text or results limit." })
  search(@Query() query: unknown): Promise<ContentSearchResults> {
    const input = contentSearchQuerySchema.safeParse(query);
    if (!input.success) throw new BadRequestException("Invalid search text or results limit");
    return this.content.searchPublishedContent(input.data);
  }

  @Get("episodes")
  @ApiOperation({ summary: "List the latest published episodes" })
  @ApiOkResponse({ description: "Published episodes with their associated show." })
  async getLatestPublishedEpisodes(): Promise<{ items: PublishedEpisodeSummary[] }> {
    return { items: await this.content.findLatestPublishedEpisodes() };
  }

  @Get("shows/:slug")
  @ApiOperation({ summary: "Get a published show and its full episode archive" })
  @ApiOkResponse({ description: "Published show with episodes ordered newest first." })
  @ApiBadRequestResponse({ description: "Invalid show slug." })
  @ApiNotFoundResponse({ description: "Published show not found." })
  getPublishedShow(@Param("slug") slug: string): Promise<PublishedShowDetail> {
    return this.content.findPublishedShow(validateSlug(slug));
  }

  @Get("shows/:slug/episodes/:episodeSlug")
  @ApiOperation({ summary: "Get a published episode and related episodes from the same show" })
  @ApiOkResponse({ description: "Published episode, parent show, and related episodes." })
  @ApiBadRequestResponse({ description: "Invalid show or episode slug." })
  @ApiNotFoundResponse({ description: "Published episode not found in this show." })
  getPublishedEpisode(
    @Param("slug") slug: string,
    @Param("episodeSlug") episodeSlug: string,
  ): Promise<PublishedEpisodeDetail> {
    return this.content.findPublishedEpisode(validateSlug(slug), validateSlug(episodeSlug));
  }
}
