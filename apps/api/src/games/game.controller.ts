import { Body, Controller, Get, Header, Inject, Param, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { contentSlugSchema, gameAttemptInputSchema, gameInputSchema, gameQuerySchema, gameRequestDocs, gameUpdateSchema, staffContentIdSchema, studioGameQuerySchema } from "@biling/schemas";
import type { ApiBodyOptions } from "@nestjs/swagger";
import type { Request } from "express";
import { StaffGuard, type StaffRequest } from "../admin/staff.guard";
import { AudienceService } from "../audience/audience.service";
import { validate } from "../common/validate";
import { GameService } from "./game.service";

function bearer(request: Request, required = false) {
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(request.headers.authorization ?? "")?.[1];
  if (!token && required) throw new UnauthorizedException("Sign in to continue.");
  return token;
}
function ip(request: Request) { return request.ip ?? request.socket.remoteAddress ?? "unknown"; }

@ApiTags("Games")
@Controller("games")
export class GameController {
  constructor(@Inject(GameService) private readonly games: GameService, @Inject(AudienceService) private readonly audience: AudienceService) {}
  private async viewer(request: Request) {
    const token = bearer(request);
    return token ? this.audience.authenticate(token) : null;
  }
  @Get()
  @ApiOperation({ summary: "List active published games" })
  list(@Query() query: unknown) { return this.games.list(validate(gameQuerySchema, query)); }
  @Get("history")
  @ApiBearerAuth("audience")
  @Header("Cache-Control", "no-store")
  async history(@Req() request: Request) {
    const token = bearer(request, true)!;
    return this.games.history((await this.audience.authenticate(token)).id);
  }
  @Get(":slug")
  @ApiOperation({ summary: "Read a playable published game without answers or scoring rules" })
  detail(@Param("slug") slug: string) { return this.games.detail(validate(contentSlugSchema, slug)); }
  @Post(":slug/attempts")
  @Header("Cache-Control", "no-store")
  @ApiResponse({ status: 409, description: "Official daily attempt already exists for this UTC day." })
  async attempt(@Param("slug") slug: string, @Body() body: unknown, @Req() request: Request) {
    const viewer = await this.viewer(request);
    if (viewer) await this.audience.limitCommunity(viewer.id, ip(request), "game-attempt", 20);
    return this.games.attempt(validate(contentSlugSchema, slug), validate(gameAttemptInputSchema, body), viewer?.id);
  }
}

@ApiTags("Admin Studio Games")
@ApiBearerAuth("staff")
@UseGuards(StaffGuard)
@Controller("admin/games")
export class StudioGameController {
  constructor(@Inject(GameService) private readonly games: GameService) {}
  @Get()
  list(@Query() query: unknown) { return this.games.studioList(validate(studioGameQuerySchema, query)); }
  @Get(":id")
  detail(@Param("id") id: string) { return this.games.studioDetail(validate(staffContentIdSchema, id)); }
  @Post()
  @ApiBody({ schema: gameRequestDocs.create } as ApiBodyOptions)
  create(@Body() body: unknown, @Req() request: StaffRequest) { return this.games.create(validate(gameInputSchema, body), request.staff); }
  @Patch(":id")
  @ApiBody({ schema: gameRequestDocs.update } as ApiBodyOptions)
  update(@Param("id") id: string, @Body() body: unknown, @Req() request: StaffRequest) { return this.games.update(validate(staffContentIdSchema, id), validate(gameUpdateSchema, body), request.staff); }
}
