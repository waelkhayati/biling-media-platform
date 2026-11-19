import { BadRequestException } from "@nestjs/common";

export function validate<T>(
  schema: {
    safeParse(input: unknown):
      | { success: true; data: T }
      | {
          success: false;
          error: { issues: ReadonlyArray<{ path: PropertyKey[]; message: string }> };
        };
  },
  input: unknown,
): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new BadRequestException(
      result.error.issues.map((issue) =>
        issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message,
      ),
    );
  }
  return result.data;
}
