/** Escapes LIKE wildcards so `ilike(column, likeExact(name))` is an exact, case-insensitive match. */
export function likeExact(value: string) {
  return value.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
}
