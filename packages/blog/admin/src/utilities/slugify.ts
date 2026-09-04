/**
 * Turn a human-readable label into a URL-safe slug.
 *
 * Decomposes accented characters first (NFD) so the combining marks can be
 * stripped as their own code points - otherwise "Café" would slugify to
 * "caf" rather than "cafe".
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
