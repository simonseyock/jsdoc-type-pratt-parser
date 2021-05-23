import { KeyValueResult, NonTerminalResult, ParseResult } from '../ParseResult'
import { assertKeyValueOrTerminal } from '../assertTypes'
import { IntermediateResult } from '../ParserEngine'
import { UnexpectedTypeError } from '../errors'

export class BaseFunctionParslet {
  protected getParameters (value: IntermediateResult): Array<ParseResult | KeyValueResult> {
    let parameters: NonTerminalResult[]
    if (value.type === 'PARAMETER_LIST') {
      parameters = value.elements
    } else if (value.type === 'PARENTHESIS') {
      parameters = [value.element]
    } else {
      throw new UnexpectedTypeError(value)
    }

    return parameters.map(p => assertKeyValueOrTerminal(p))
  }

  protected getNamedParameters (value: IntermediateResult): KeyValueResult[] {
    const parameters = this.getParameters(value)
    if (parameters.some(p => p.type !== 'KEY_VALUE')) {
      throw new Error('All parameters should be named')
    }
    return parameters as KeyValueResult[]
  }

  protected getUnnamedParameters (value: IntermediateResult): ParseResult[] {
    const parameters = this.getParameters(value)
    if (parameters.some(p => p.type === 'KEY_VALUE')) {
      throw new Error('No parameter should be named')
    }
    return parameters as ParseResult[]
  }
}
