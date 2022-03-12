import { Header } from "har-format"

/**
 * Given a headers object retrieve the contents of a header out of it via a case-insensitive key.
 *
 * @param headers The header
 * @param name The name of the header
 */
export function getHeader(headers: Header, name: string): string | undefined{
  const key = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase())
  if (key === undefined) {
    return undefined;
  }
  return headers[key]
}

/**
 * Given a headers object retrieve a specific header out of it via a case-insensitive key.
 *
 * @param headers
 * @param name
 */
export function getHeaderName(headers: Record<string, string>, name: string) {
  // eslint-disable-next-line array-callback-return
  return Object.keys(headers).find(k => {
    if (k.toLowerCase() === name.toLowerCase()) {
      return k
    }
  })
}

/**
 * Determine if a given case-insensitive header exists within a header object.
 *
 * @param headers
 * @param name
 */
export function hasHeader(headers: Record<string, string>, name: string): boolean {
  return Boolean(Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase()))
}
