import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { PublishedEpisodeSummary, PublishedShowSummary } from "@biling/contracts";
import { ContentService } from "./content.service";

@ApiTags("content")
@Controller()
export class ContentController {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  @Get("shows")
  @ApiOperation({ summary: "List published shows for public discovery" })
  @ApiOkResponse({ description: "Published shows, with their latest published episode." })
  async getPublishedShows(): Promise<{ items: PublishedShowSummary[] }> {
    return { items: await this.content.findPublishedShows() };
  }

  @Get("episodes")
  @ApiOperation({ summary: "List the latest published episodes" })
  @ApiOkResponse({ description: "Published episodes with their associated show." })
  async getLatestPublishedEpisodes(): Promise<{ items: PublishedEpisodeSummary[] }> {
    return { items: await this.content.findLatestPublishedEpisodes() };
  }
}
