import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  audienceEmailSchema,
  audienceLoginSchema,
  audienceProfileUpdateSchema,
  audienceRegisterSchema,
  audienceResetSchema,
  audienceVerifySchema,
} from "@biling/schemas";
import type { Request } from "express";
import { validate } from "../common/validate";
import { AudienceService } from "./audience.service";

function ip(request: Request) {
  return request.ip ?? request.socket.remoteAddress ?? "unknown";
}

function bearer(request: Request) {
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(request.headers.authorization ?? "")?.[1];
  if (!token) throw new UnauthorizedException("Sign in to continue.");
  return token;
}

@ApiTags("Audience accounts")
@Controller("audience")
export class AudienceController {
  constructor(@Inject(AudienceService) private readonly audience: AudienceService) {}

  @Get("capabilities")
  @Header("Cache-Control", "no-store")
  capabilities() {
    return this.audience.capabilities();
  }

  @Post("register")
  @HttpCode(202)
  @Header("Cache-Control", "no-store")
  async register(@Body() input: unknown, @Req() request: Request) {
    await this.audience.register(validate(audienceRegisterSchema, input), ip(request));
  }

  @Post("login")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  login(@Body() input: unknown, @Req() request: Request) {
    return this.audience.login(validate(audienceLoginSchema, input), ip(request));
  }

  @Post("logout")
  @ApiBearerAuth("audience")
  @HttpCode(204)
  @Header("Cache-Control", "no-store")
  logout(@Req() request: Request) {
    return this.audience.logout(bearer(request));
  }

  @Get("me")
  @ApiBearerAuth("audience")
  @Header("Cache-Control", "no-store")
  me(@Req() request: Request) {
    return this.audience.authenticate(bearer(request));
  }

  @Patch("me")
  @ApiBearerAuth("audience")
  @Header("Cache-Control", "no-store")
  async update(@Body() input: unknown, @Req() request: Request) {
    const user = await this.audience.authenticate(bearer(request));
    return this.audience.updateProfile(user.id, validate(audienceProfileUpdateSchema, input));
  }

  @Post("forgot-password")
  @HttpCode(202)
  @Header("Cache-Control", "no-store")
  async forgot(@Body() input: unknown, @Req() request: Request) {
    const { email } = validate(audienceEmailSchema, input);
    await this.audience.requestEmail(email, "RESET_PASSWORD", ip(request));
  }

  @Post("resend-verification")
  @HttpCode(202)
  @Header("Cache-Control", "no-store")
  async resend(@Body() input: unknown, @Req() request: Request) {
    const { email } = validate(audienceEmailSchema, input);
    await this.audience.requestEmail(email, "VERIFY_EMAIL", ip(request));
  }

  @Post("verify-email")
  @HttpCode(204)
  @Header("Cache-Control", "no-store")
  verify(@Body() input: unknown, @Req() request: Request) {
    const { token, password } = validate(audienceVerifySchema, input);
    return this.audience.finishEmail(token, password, "VERIFY_EMAIL", ip(request));
  }

  @Post("reset-password")
  @HttpCode(204)
  @Header("Cache-Control", "no-store")
  reset(@Body() input: unknown, @Req() request: Request) {
    const { token, password } = validate(audienceResetSchema, input);
    return this.audience.finishEmail(token, password, "RESET_PASSWORD", ip(request));
  }
}
