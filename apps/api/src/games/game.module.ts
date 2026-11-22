import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { AudienceModule } from "../audience/audience.module";
import { GameController, StudioGameController } from "./game.controller";
import { GameService } from "./game.service";

@Module({ imports: [AdminModule, AudienceModule], controllers: [GameController, StudioGameController], providers: [GameService] })
export class GameModule {}
