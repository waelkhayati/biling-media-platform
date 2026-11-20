import { Body, Controller, Get, Inject, Param, Patch, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { communityIdSchema, moderationActionSchema, moderationQuerySchema } from "@biling/schemas";
import { validate } from "../common/validate";
import { StaffGuard, type StaffRequest } from "../admin/staff.guard";
import { CommunityService } from "./community.service";

@ApiTags("Community moderation")
@ApiBearerAuth("staff")
@UseGuards(StaffGuard)
@Controller("admin/community")
export class ModerationController {
  constructor(@Inject(CommunityService) private readonly community: CommunityService) {}
  @Get("reports") reports(@Query() query: unknown) {
    return this.community.moderation(validate(moderationQuerySchema, query));
  }
  @Patch("comments/:id") async moderate(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: StaffRequest,
  ) {
    await this.community.moderate(
      validate(communityIdSchema, id),
      validate(moderationActionSchema, body),
      request.staff,
    );
  }
}
