import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  commentCreateSchema,
  commentListQuerySchema,
  commentReportSchema,
  commentUpdateSchema,
  communityIdSchema,
  communityTargetSchema,
  contentSlugSchema,
} from "@biling/schemas";
import type { Request } from "express";
import { AudienceService } from "../audience/audience.service";
import { validate } from "../common/validate";
import { CommunityService } from "./community.service";

function token(request: Request, required = true) {
  const value = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(request.headers.authorization ?? "")?.[1];
  if (!value && required) throw new UnauthorizedException("Sign in to continue.");
  return value;
}
function ip(request: Request) {
  return request.ip ?? request.socket.remoteAddress ?? "unknown";
}

@ApiTags("Community")
@Controller("community")
export class CommunityController {
  constructor(
    @Inject(CommunityService) private readonly community: CommunityService,
    @Inject(AudienceService) private readonly audience: AudienceService,
  ) {}
  private async viewer(request: Request, required = false) {
    const bearer = token(request, required);
    return bearer ? this.audience.authenticate(bearer) : null;
  }
  private async write(request: Request, action: string) {
    const viewer = await this.viewer(request, true);
    await this.audience.limitCommunity(viewer!.id, ip(request), action);
    return viewer!;
  }

  @Get("comments")
  @Header("Cache-Control", "no-store")
  async comments(@Query() query: unknown, @Req() request: Request) {
    return this.community.comments(
      validate(commentListQuerySchema, query),
      (await this.viewer(request))?.id,
    );
  }

  @Post("comments")
  @ApiBearerAuth("audience")
  @Header("Cache-Control", "no-store")
  async create(@Body() body: unknown, @Req() request: Request) {
    const viewer = await this.write(request, "comment");
    return this.community.create(validate(commentCreateSchema, body), viewer.id);
  }

  @Patch("comments/:id")
  @ApiBearerAuth("audience")
  @HttpCode(204)
  async update(@Param("id") id: string, @Body() body: unknown, @Req() request: Request) {
    const viewer = await this.write(request, "edit");
    await this.community.update(
      validate(communityIdSchema, id),
      validate(commentUpdateSchema, body),
      viewer.id,
    );
  }

  @Delete("comments/:id")
  @ApiBearerAuth("audience")
  @HttpCode(204)
  async remove(@Param("id") id: string, @Req() request: Request) {
    const viewer = await this.write(request, "delete");
    await this.community.remove(validate(communityIdSchema, id), viewer.id);
  }

  @Post("comments/:id/reports")
  @ApiBearerAuth("audience")
  @HttpCode(204)
  async report(@Param("id") id: string, @Body() body: unknown, @Req() request: Request) {
    const viewer = await this.write(request, "report");
    await this.community.report(
      validate(communityIdSchema, id),
      validate(commentReportSchema, body),
      viewer.id,
    );
  }

  @Put("comments/:id/likes")
  @ApiBearerAuth("audience")
  @HttpCode(204)
  async likeComment(@Param("id") id: string, @Req() request: Request) {
    const viewer = await this.write(request, "comment-reaction");
    await this.community.setCommentLike(validate(communityIdSchema, id), viewer.id, true);
  }

  @Delete("comments/:id/likes")
  @ApiBearerAuth("audience")
  @HttpCode(204)
  async unlikeComment(@Param("id") id: string, @Req() request: Request) {
    const viewer = await this.write(request, "comment-reaction");
    await this.community.setCommentLike(validate(communityIdSchema, id), viewer.id, false);
  }

  @Get("engagement")
  @Header("Cache-Control", "no-store")
  async engagement(@Query() query: unknown, @Req() request: Request) {
    return this.community.engagement(
      validate(communityTargetSchema, query),
      (await this.viewer(request))?.id,
    );
  }

  @Put("likes")
  @ApiBearerAuth("audience")
  async like(@Body() body: unknown, @Req() request: Request) {
    const viewer = await this.write(request, "reaction");
    return this.community.setLike(validate(communityTargetSchema, body), viewer.id, true);
  }
  @Delete("likes")
  @ApiBearerAuth("audience")
  async unlike(@Body() body: unknown, @Req() request: Request) {
    const viewer = await this.write(request, "reaction");
    return this.community.setLike(validate(communityTargetSchema, body), viewer.id, false);
  }

  @Put("shows/:slug/follow")
  @ApiBearerAuth("audience")
  async follow(@Param("slug") slug: string, @Req() request: Request) {
    const viewer = await this.write(request, "follow");
    return this.community.setFollow(validate(contentSlugSchema, slug), viewer.id, true);
  }
  @Delete("shows/:slug/follow")
  @ApiBearerAuth("audience")
  async unfollow(@Param("slug") slug: string, @Req() request: Request) {
    const viewer = await this.write(request, "follow");
    return this.community.setFollow(validate(contentSlugSchema, slug), viewer.id, false);
  }

  @Get("following")
  @ApiBearerAuth("audience")
  @Header("Cache-Control", "no-store")
  async following(@Req() request: Request) {
    return this.community.followed((await this.viewer(request, true))!.id);
  }
}
