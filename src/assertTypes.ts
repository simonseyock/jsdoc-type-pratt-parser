import { KeyValueResult, NameResult, NumberResult, ParseResult, VariadicResult } from './ParseResult'
import { UnexpectedTypeError } from './errors'
import { IntermediateResult } from './ParserEngine'

export function assertTerminal (result?: IntermediateResult): ParseResult {
  if (result === undefined) {
    throw new Error('Unexpected undefined')
  }
  if (result.type === 'KEY_VALUE' || result.type === 'NUMBER' || result.type === 'PARAMETER_LIST') {
    throw new UnexpectedTypeError(result)
  }
  return result
}

export function assertNamedKeyValueOrTerminal (result: IntermediateResult): KeyValueResult | ParseResult {
  if (result.type === 'KEY_VALUE') {
    if (result.left.type !== 'NAME') {
      throw new UnexpectedTypeError(result)
    }
    return result as KeyValueResult
  }
  return assertTerminal(result)
}

export function assertNamedKeyValueOrName (result: IntermediateResult): KeyValueResult | NameResult {
  if (result.type === 'KEY_VALUE') {
    if (result.left.type !== 'NAME') {
      throw new UnexpectedTypeError(result)
    }
    return result as KeyValueResult
  } else if (result.type !== 'NAME') {
    throw new UnexpectedTypeError(result)
  }
  return result
}

export function assertNumberOrVariadicName (result: IntermediateResult): NumberResult | NameResult | VariadicResult<NameResult> {
  if (result.type === 'VARIADIC') {
    if (result.element?.type === 'NAME') {
      return result as VariadicResult<NameResult>
    }
    throw new UnexpectedTypeError(result)
  }
  if (result.type !== 'NUMBER' && result.type !== 'NAME') {
    throw new UnexpectedTypeError(result)
  }
  return result
}