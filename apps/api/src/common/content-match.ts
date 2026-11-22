export function matchContentText(query: string) {
  // Prisma maps contains to SQL LIKE/ILIKE. Treat its wildcard characters as literal text.
  const pattern = { contains: query.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" } as const;
  return [{ title: pattern }, { description: pattern }];
}
