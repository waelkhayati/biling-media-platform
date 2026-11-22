import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { AudienceModule } from "../audience/audience.module";
import { GameController, StudioGameController } from "./game.controller";
import { GameService } from "./game.service";
import { ArcadeController, StudioArcadeController } from "./arcade.controller";
import { ArcadeService } from "./arcade.service";

@Module({
  imports: [AdminModule, AudienceModule],
  controllers: [GameController, StudioGameController, ArcadeController, StudioArcadeController],
  providers: [GameService, ArcadeService],
})
export class GameModule {}
