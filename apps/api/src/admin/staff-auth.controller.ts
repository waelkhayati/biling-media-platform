import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Post,
  Req,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { staffLoginSchema, staffOtpInputSchema, staffRecoveryInputSchema } from "@biling/schemas";
import { StaffAuthService } from "./staff-auth.service";
import { StaffGuard, type StaffRequest } from "./staff.guard";
import { bearerToken } from "./staff-security";

function requestChallenge(request: Request) {
  const token = bearerToken(request.headers.authorization);
  if (!token) throw new UnauthorizedException("A staff sign-in challenge is required.");
  return token;
}

function sourceIp(request: Request) {
  return request.ip ?? request.socket.remoteAddress ?? "unknown";
}

@ApiTags("Staff authentication")
@Controller("admin/auth")
export class StaffAuthController {
  constructor(@Inject(StaffAuthService) private readonly auth: StaffAuthService) {}

  @Post("login")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Exchange staff credentials for a short-lived MFA challenge" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string", format: "password", writeOnly: true },
        setupCode: { type: "string", writeOnly: true },
      },
    },
  })
  @ApiResponse({ status: 429, description: "Too many attempts." })
  login(@Body() body: unknown, @Req() request: Request) {
    const input = staffLoginSchema.safeParse(body);
    if (!input.success) throw new BadRequestException("Enter a valid email and password.");
    return this.auth.login(input.data, sourceIp(request));
  }

  @Get("challenge")
  @Header("Cache-Control", "no-store")
  @ApiBearerAuth("staff")
  @ApiOperation({ summary: "Read sign-in challenge details with the challenge bearer" })
  challenge(@Req() request: Request) {
    return this.auth.challenge(requestChallenge(request));
  }

  @Post("verify")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @ApiBearerAuth("staff")
  @ApiOperation({ summary: "Verify an authenticator code and issue a staff session" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["code"],
      properties: { code: { type: "string", writeOnly: true } },
    },
  })
  verify(@Body() body: unknown, @Req() request: Request) {
    const input = staffOtpInputSchema.safeParse(body);
    if (!input.success) throw new BadRequestException("Enter the six-digit authenticator code.");
    return this.auth.verifyChallenge(requestChallenge(request), input.data.code);
  }

  @Post("recover")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Redeem an operator-issued one-time account recovery code" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["code", "password"],
      properties: {
        code: { type: "string", writeOnly: true },
        password: { type: "string", format: "password", writeOnly: true },
      },
    },
  })
  recover(@Body() body: unknown, @Req() request: Request) {
    const input = staffRecoveryInputSchema.safeParse(body);
    if (!input.success)
      throw new BadRequestException("Enter a valid recovery code and new password.");
    return this.auth.redeemEnrollment(input.data, sourceIp(request), "RECOVERY");
  }

  @Post("signup")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @ApiOperation({
    summary: "Accept an operator-issued staff invitation and start authenticator setup",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["code", "password"],
      properties: {
        code: { type: "string", writeOnly: true },
        password: { type: "string", format: "password", writeOnly: true },
      },
    },
  })
  signup(@Body() body: unknown, @Req() request: Request) {
    const input = staffRecoveryInputSchema.safeParse(body);
    if (!input.success)
      throw new BadRequestException("Enter a valid invitation code and password.");
    return this.auth.redeemEnrollment(input.data, sourceIp(request), "INVITE");
  }

  @Get("me")
  @ApiBearerAuth("staff")
  @UseGuards(StaffGuard)
  me(@Req() request: StaffRequest) {
    return request.staff;
  }

  @Post("logout")
  @HttpCode(204)
  @ApiBearerAuth("staff")
  @UseGuards(StaffGuard)
  logout(@Req() request: StaffRequest) {
    return this.auth.logout(request.staffToken);
  }
}
