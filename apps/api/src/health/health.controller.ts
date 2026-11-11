import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { createHealthResponse, type HealthResponse } from "./health-response";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Check whether the API process is responsive" })
  @ApiResponse({ status: 200, description: "The API is healthy." })
  getHealth(): HealthResponse {
    return createHealthResponse();
  }
}
