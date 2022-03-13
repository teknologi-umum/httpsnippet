import util from 'util'

/**
 * Use 'strong quoting' using single quotes so that we only need
 * to deal with nested single quote characters.
 * http://wiki.bash-hackers.org/syntax/quoting#strong_quoting
 */
export function quote(value: string) {
  const SAFE = /^[a-z0-9-_/.@%^=:]+$/i

  // Unless `value` is a simple shell-safe string, quote it.
  if (!SAFE.test(value)) {
    return util.format('\'%s\'', value.replace(/'/g, "'\\''"))
  }

  return value
}

export function escape(value: string) {
  return value.replace(/\r/g, '\\r').replace(/\n/g, '\\n')
}
