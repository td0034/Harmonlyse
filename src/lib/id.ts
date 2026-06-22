/**
 * Generate a UUID v4.
 *
 * Uses `crypto.getRandomValues` rather than `crypto.randomUUID` on purpose:
 * randomUUID is only available in a secure context, which excludes plain-HTTP
 * access over the LAN / tailnet. getRandomValues works everywhere.
 */
export function uid(): string {
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40 // version 4
  b[8] = (b[8] & 0x3f) | 0x80 // variant 10
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'))
  return (
    `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-` +
    `${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`
  )
}
