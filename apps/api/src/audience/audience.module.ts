import { Module } from "@nestjs/common";
import { AudienceController } from "./audience.controller";
import { AudienceEmail } from "./audience-email";
import { AudienceService } from "./audience.service";

@Module({
  controllers: [AudienceController],
  providers: [AudienceEmail, AudienceService],
  exports: [AudienceService],
})
export class AudienceModule {}
