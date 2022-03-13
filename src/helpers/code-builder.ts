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

  constructor(private _indentation: string, private _lineJoin = "\n") {
    if (typeof _indentation !== "string") {
      this._indentation = ""
    }

    this._code = []
  }

  /**
   * Add given indentation level to given string and format the string (variadic)
   * @param {number} [indentationLevel=0] - Desired level of indentation for this line
   * @param {string} lineOrArgs - Line of code. Can contain formatting placeholders
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
  private buildLine(
    indentLevel: number,
    line: string | null,
    ...args: any[]
  ): string | null {
    if (line === null) return null
    let lineIndentation = this._indentation.repeat(indentLevel)
    return util.format(lineIndentation + line, ...args)
  }

  /**
   * Invoke buildLine() and add the line at the top of current lines
   * @param line The content of the line. Null will be treated as an empty line
   * @param args Placeholder value that will be passed to NodeJS `util.format`
   * @return {this}
   */
  unshift(line: string | null, ...args: any[]): this;
  /**
   * Invoke buildLine() and add the line at the top of current lines
   * @param indentationLevel Current line indentation level
   * @param line The content of the line. Null will be treated as an empty line
   * @param args Placeholder value that will be passed to NodeJS `util.format`
   * @return {this}
   */
  unshift(indentationLevel: number, line: string, ...args: any[]): this;
  unshift(indentLevelOrLine: any, lineOrArgs?: any, ...args: any[]): this {
    if (indentLevelOrLine === null) {
      this._code.unshift(this.buildLine(0, null))
    }

    if (typeof indentLevelOrLine === "number") {
      this._code.unshift(this.buildLine(indentLevelOrLine, lineOrArgs, ...args));
    }

    if (typeof indentLevelOrLine === "string") {
      let data = args || [];
      if (typeof lineOrArgs !== "undefined") {
        data.unshift(lineOrArgs)
      }

      this._code.unshift(this.buildLine(0, indentLevelOrLine, ...data))
    }

    return this
  }

  /**
   * Invoke buildLine() and add the line at the bottom of current lines
   * @param line The content of the line. Null will be treated as an empty line
   * @param args Placeholder value that will be passed to NodeJS `util.format`
   * @return {this}
   */
  push(line: string | null, ...args: any[]): this;
  /**
   * Invoke buildLine() and add the line at the bottom of current lines
   * @param indentationLevel Current line indentation level
   * @param line The content of the line. Null will be treated as an empty line
   * @param args Placeholder value that will be passed to NodeJS `util.format`
   * @return {this}
   */
  push(indentationLevel: number, line: string, ...args: any[]): this;
  push(indentLevelOrLine: any, lineOrArgs?: any, ...args: any[]): this {
    if (indentLevelOrLine === null) {
      this._code.push(this.buildLine(0, null))
    }

    if (typeof indentLevelOrLine === "number") {
      this._code.push(this.buildLine(indentLevelOrLine, lineOrArgs, ...args));
    }

    if (typeof indentLevelOrLine === "string") {
      let data = args || [];
      if (typeof lineOrArgs !== "undefined") {
        data.unshift(lineOrArgs)
      }

      this._code.push(this.buildLine(0, indentLevelOrLine, ...data))
    }

    // @ts-ignore
    // this._code.push(this.buildLine(...arguments))

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
