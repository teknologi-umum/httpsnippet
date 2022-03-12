import util from 'util'

/**
 * Helper object to format and aggragate lines of code.
 * Lines are aggregated in a `code` array, and need to be joined to obtain a proper code snippet.
 *
 * @class
 *
 * @param {string} indentation Desired indentation character for aggregated lines of code
 * @param {string} join Desired character to join each line of code
 */
export default class CodeBuilder {
  private _code: (string | null)[];

  constructor(private _indentation = "", private _lineJoin = "\n") {
    this._code = []
  }

  /**
   * Add given indentation level to given string and format the string (variadic)
   * @param {number} [indentationLevel=0] - Desired level of indentation for this line
   * @param {string} line - Line of code. Can contain formatting placeholders
   * @param {...anyobject} - Parameter to bind to `line`'s formatting placeholders
   * @return {string}
   *
   * @example
   *   var builder = CodeBuilder('\t')
   *
   *   builder.buildLine('console.log("hello world")')
   *   // returns: 'console.log("hello world")'
   *
   *   builder.buildLine(2, 'console.log("hello world")')
   *   // returns: 'console.log("\t\thello world")'
   *
   *   builder.buildLine(2, 'console.log("%s %s")', 'hello', 'world')
   *   // returns: 'console.log("\t\thello world")'
   */
  buildLine(line: null): null;
  buildLine(line: string, ...args: any[]): string;
  buildLine(indentationLevel: number, line: string, ...args: any[]): string;
  buildLine(indentLevelOrLine: string | number | null, line?: any, ...args: any[]): string | null {
    if (indentLevelOrLine === null) return null

    if (typeof indentLevelOrLine === "string") {
      let data = args;
      if (typeof line !== "undefined") {
        data.unshift(line)
      }

      return util.format(indentLevelOrLine, ...args)
    }

    let lineIndentation = this._indentation.repeat(indentLevelOrLine);

    return util.format(lineIndentation + line, ...args)
  }

  /**
   * Invoke buildLine() and add the line at the top of current lines
   * @param {number} [indentationLevel=0] Desired level of indentation for this line
   * @param {string} line Line of code
   * @return {this}
   */
  unshift(): this {
    // @ts-ignore
    this._code.unshift(this.buildLine(...arguments))

    return this
  }

  /**
   * Invoke buildLine() and add the line at the bottom of current lines
   * @param {number} [indentationLevel=0] Desired level of indentation for this line
   * @param {string} line Line of code
   * @return {this}
   */
  push() {
    // @ts-ignore
    this._code.push(this.buildLine(...arguments))

    return this
  }

  /**
   * Add an empty line at the end of current lines
   */
  blank(): this {
    this._code.push(null)

    return this
  }

  /**
   * Concatenate all current lines using the given lineJoin
   */
  join(): string {
    return this._code.join(this._lineJoin)
  }
}
