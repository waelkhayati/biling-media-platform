import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  arcadeActionSchema,
  arcadeDateSchema,
  arcadePuzzleInputSchema,
  contentSlugSchema,
} from "@biling/schemas";
import type { Request } from "express";
import { StaffGuard, type StaffRequest } from "../admin/staff.guard";
import { AudienceService } from "../audience/audience.service";
import { validate } from "../common/validate";
import { ArcadeService } from "./arcade.service";

@Controller("arcade")
export class ArcadeController {
  constructor(
    @Inject(ArcadeService) private readonly arcade: ArcadeService,
    @Inject(AudienceService) private readonly audience: AudienceService,
  ) {}

  private async viewer(request: Request, write = false) {
    const token = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(request.headers.authorization ?? "")?.[1];
    if (!token && write) throw new UnauthorizedException("Sign in to play this daily puzzle.");
    if (!token) return undefined;
    const user = await this.audience.authenticate(token);
    if (write)
      await this.audience.limitCommunity(
        user.id,
        request.ip ?? request.socket.remoteAddress ?? "unknown",
        "arcade-move",
        120,
      );
    return user.id;
  }

  @Get()
  @Header("Cache-Control", "no-store")
  async list(@Req() request: Request) {
    return this.arcade.list(await this.viewer(request));
  }

  @Get(":slug/:date")
  @Header("Cache-Control", "no-store")
  async read(@Param("slug") slug: string, @Param("date") date: string, @Req() request: Request) {
    return this.arcade.read(
      validate(contentSlugSchema, slug),
      validate(arcadeDateSchema, date),
      await this.viewer(request),
    );
  }

  @Post(":slug/:date/start")
  @Header("Cache-Control", "no-store")
  async start(@Param("slug") slug: string, @Param("date") date: string, @Req() request: Request) {
    const user = await this.viewer(request, true);
    return this.arcade.start(
      validate(contentSlugSchema, slug),
      validate(arcadeDateSchema, date),
      user!,
    );
  }

  @Post(":slug/:date/moves")
  @Header("Cache-Control", "no-store")
  async move(
    @Param("slug") slug: string,
    @Param("date") date: string,
    @Req() request: Request,
    @Body() body: unknown,
  ) {
    const user = await this.viewer(request, true);
    return this.arcade.act(
      validate(contentSlugSchema, slug),
      validate(arcadeDateSchema, date),
      user!,
      validate(arcadeActionSchema, body),
    );
  }
}

@Controller("admin/arcade")
@UseGuards(StaffGuard)
export class StudioArcadeController {
  constructor(@Inject(ArcadeService) private readonly arcade: ArcadeService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  list() {
    return this.arcade.studioList();
  }

  @Post()
  @Header("Cache-Control", "no-store")
  save(@Body() body: unknown, @Req() request: StaffRequest) {
    return this.arcade.save(validate(arcadePuzzleInputSchema, body), request.staff);
  }
}
