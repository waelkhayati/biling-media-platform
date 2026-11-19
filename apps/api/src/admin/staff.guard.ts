import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { StaffIdentity } from "@biling/contracts";
import { StaffAuthService } from "./staff-auth.service";
import { bearerToken } from "./staff-security";

export type StaffRequest = Request & { staff: StaffIdentity; staffToken: string };

@Injectable()
export class StaffGuard implements CanActivate {
  constructor(@Inject(StaffAuthService) private readonly auth: StaffAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    http.getResponse<Response>().set("Cache-Control", "no-store");
    const request = http.getRequest<StaffRequest>();
    const token = bearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException("Staff sign-in required.");
    request.staff = await this.auth.authenticate(token);
    request.staffToken = token;
    return true;
  }
}
