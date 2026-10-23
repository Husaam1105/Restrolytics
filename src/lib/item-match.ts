/**
 * Key for an exact, case-insensitive item lookup against the generated
 * `inventory_items.name_key` column (= lower(name)). Use with `.eq`, never a
 * LIKE pattern: PostgREST treats `*`, `%` and `_` in like/ilike as wildcards.
 */
export function itemNameKey(name: string) {
  return name.trim().toLowerCase();
}
