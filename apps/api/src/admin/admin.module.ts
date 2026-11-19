import { Module } from "@nestjs/common";
import { StaffAuthController } from "./staff-auth.controller";
import { StaffAccessController } from "./staff-access.controller";
import { StaffAuthService } from "./staff-auth.service";
import { StaffGuard } from "./staff.guard";
import { StudioController } from "./studio.controller";
import { StudioService } from "./studio.service";

@Module({
  controllers: [StaffAuthController, StaffAccessController, StudioController],
  exports: [StaffAuthService, StaffGuard],
  providers: [StaffAuthService, StaffGuard, StudioService],
})
export class AdminModule {}
