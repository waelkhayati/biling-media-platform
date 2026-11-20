import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { AudienceModule } from "../audience/audience.module";
import { CommunityController } from "./community.controller";
import { ModerationController } from "./moderation.controller";
import { CommunityService } from "./community.service";

@Module({
  imports: [AudienceModule, AdminModule],
  controllers: [CommunityController, ModerationController],
  providers: [CommunityService],
})
export class CommunityModule {}
