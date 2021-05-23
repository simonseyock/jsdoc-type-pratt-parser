import { InfixParslet, PrefixParslet } from './Parslet'
import { TokenType } from '../lexer/Token'
import { Precedence } from '../Precedence'
import { assertTerminal } from '../assertTypes'
import { ParserEngine } from '../ParserEngine'
import { TerminalResult, VariadicResult } from '../result/TerminalResult'
import { IntermediateResult } from '../result/IntermediateResult'

interface VariadicParsletOptions {
  allowEnclosingBrackets: boolean
}

export class VariadicParslet implements PrefixParslet, InfixParslet {
  private readonly allowEnclosingBrackets: boolean

  constructor (opts: VariadicParsletOptions) {
    this.allowEnclosingBrackets = opts.allowEnclosingBrackets
  }

  accepts (type: TokenType): boolean {
    return type === '...'
  }

  getPrecedence (): Precedence {
    return Precedence.PREFIX
  }

  parsePrefix (parser: ParserEngine): VariadicResult<TerminalResult> {
    parser.consume('...')

    const brackets = this.allowEnclosingBrackets && parser.consume('[')
    const value = parser.tryParseType(Precedence.PREFIX)
    if (brackets && !parser.consume(']')) {
      throw new Error('Unterminated variadic type. Missing \']\'')
    }

    if (value !== undefined) {
      return {
        type: 'JsdocTypeVariadic',
        element: assertTerminal(value),
        meta: {
          position: 'prefix',
          squareBrackets: brackets
        }
      }
    } else {
      return {
        type: 'JsdocTypeVariadic',
        meta: {
          position: undefined,
          squareBrackets: false
        }
      }
    }
  }

  parseInfix (parser: ParserEngine, left: IntermediateResult): TerminalResult {
    parser.consume('...')
    return {
      type: 'JsdocTypeVariadic',
      element: assertTerminal(left),
      meta: {
        position: 'suffix',
        squareBrackets: false
      }
    }
  }
}
