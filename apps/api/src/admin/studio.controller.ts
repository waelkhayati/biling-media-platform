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
  staffContentIdSchema,
  staffEpisodeInputSchema,
  staffEpisodeUpdateSchema,
  staffListQuerySchema,
  staffShowInputSchema,
  staffShowUpdateSchema,
} from "@biling/schemas";
import { validate } from "../common/validate";
import { StaffGuard, type StaffRequest } from "./staff.guard";
import { StudioService } from "./studio.service";

const commonProperties = {
  title: { type: "string" },
  slug: { type: "string" },
  description: { type: "string", nullable: true },
  status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] },
};
const showProperties = {
  ...commonProperties,
  posterUrl: { type: "string", nullable: true },
  featured: { type: "boolean" },
  genre: { type: "string", nullable: true },
  releaseYear: { type: "integer", nullable: true },
  trailerYoutubeVideoId: { type: "string", nullable: true },
};
const episodeProperties = {
  ...commonProperties,
  showId: { type: "string" },
  youtubeVideoId: { type: "string", nullable: true },
  episodeNumber: { type: "integer", nullable: true },
  durationSeconds: { type: "integer", nullable: true },
  publishedAt: { type: "string", format: "date-time", nullable: true },
};
const revision = {
  type: "string",
  format: "date-time",
  description: "The updatedAt returned by the most recent read.",
};

@ApiTags("Admin Studio")
@ApiBearerAuth("staff")
@ApiResponse({ status: 401, description: "Staff session required." })
@ApiResponse({ status: 403, description: "This operation requires an administrator." })
@UseGuards(StaffGuard)
@Controller("admin")
export class StudioController {
  constructor(@Inject(StudioService) private readonly studio: StudioService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Get publication counts and recently modified content" })
  dashboard() {
    return this.studio.dashboard();
  }

  @Get("shows")
  @ApiOperation({ summary: "List productions, optionally filtered by status and page" })
  @ApiQuery({ name: "status", required: false, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] })
  @ApiQuery({ name: "page", required: false, type: Number })
  shows(@Query() query: unknown) {
    return this.studio.shows(validate(staffListQuerySchema, query));
  }

  @Get("show-options")
  @ApiOperation({ summary: "List production choices for episode forms" })
  showOptions() {
    return this.studio.showOptions();
  }

  @Get("shows/:id")
  @ApiOperation({ summary: "Read a production in any publication state" })
  show(@Param("id") id: string) {
    return this.studio.show(validate(staffContentIdSchema, id));
  }

  @Post("shows")
  @ApiOperation({ summary: "Create a production" })
  @ApiBody({
    schema: { type: "object", required: Object.keys(showProperties), properties: showProperties },
  })
  createShow(@Body() body: unknown, @Req() request: StaffRequest) {
    return this.studio.createShow(validate(staffShowInputSchema, body), request.staff);
  }

  @Patch("shows/:id")
  @ApiOperation({ summary: "Update a production with its current revision" })
  @ApiBody({
    schema: {
      type: "object",
      required: [...Object.keys(showProperties), "revision"],
      properties: { ...showProperties, revision },
    },
  })
  updateShow(@Param("id") id: string, @Body() body: unknown, @Req() request: StaffRequest) {
    return this.studio.updateShow(
      validate(staffContentIdSchema, id),
      validate(staffShowUpdateSchema, body),
      request.staff,
    );
  }

  @Get("episodes")
  @ApiOperation({ summary: "List episodes, optionally filtered by status, production, and page" })
  @ApiQuery({ name: "status", required: false, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] })
  @ApiQuery({ name: "showId", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  episodes(@Query() query: unknown) {
    return this.studio.episodes(validate(staffListQuerySchema, query));
  }

  @Get("episodes/:id")
  @ApiOperation({ summary: "Read an episode in any publication state" })
  episode(@Param("id") id: string) {
    return this.studio.episode(validate(staffContentIdSchema, id));
  }

  @Post("episodes")
  @ApiOperation({ summary: "Create an episode for a production" })
  @ApiBody({
    schema: {
      type: "object",
      required: Object.keys(episodeProperties),
      properties: episodeProperties,
    },
  })
  createEpisode(@Body() body: unknown, @Req() request: StaffRequest) {
    return this.studio.createEpisode(validate(staffEpisodeInputSchema, body), request.staff);
  }

  @Patch("episodes/:id")
  @ApiOperation({ summary: "Update an episode with its current revision" })
  @ApiBody({
    schema: {
      type: "object",
      required: [...Object.keys(episodeProperties), "revision"],
      properties: { ...episodeProperties, revision },
    },
  })
  updateEpisode(@Param("id") id: string, @Body() body: unknown, @Req() request: StaffRequest) {
    return this.studio.updateEpisode(
      validate(staffContentIdSchema, id),
      validate(staffEpisodeUpdateSchema, body),
      request.staff,
    );
  }
}
