import { extractSpecialParams, notAvailableTransform, transform, TransformRules } from './transform'
import { assertTerminal } from '../assertTypes'
import { TerminalResult } from '../result/TerminalResult'

export const reservedWords = [
  'null',
  'true',
  'false',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield'
]

interface ModifiableResult {
  optional?: boolean
  nullable?: boolean
  repeatable?: boolean
}

export type CatharsisParseResult =
  CatharsisNameResult
  | CatharsisUnionResult
  | CatharsisGenericResult
  | CatharsisNullResult
  | CatharsisUndefinedResult
  | CatharsisAllResult
  | CatharsisUnknownResult
  | CatharsisFunctionResult
  | CatharsisRecordResult
  | CatharsisFieldResult

export type CatharsisNameResult = ModifiableResult & {
  type: 'NameExpression'
  name: string
  reservedWord?: boolean
}

export type CatharsisUnionResult = ModifiableResult & {
  type: 'TypeUnion'
  elements: CatharsisParseResult[]
}

export type CatharsisGenericResult = ModifiableResult & {
  type: 'TypeApplication'
  expression: CatharsisParseResult
  applications: CatharsisParseResult[]
}

export type CatharsisNullResult = ModifiableResult & {
  type: 'NullLiteral'
}

export type CatharsisUndefinedResult = ModifiableResult & {
  type: 'UndefinedLiteral'
}

export type CatharsisAllResult = ModifiableResult & {
  type: 'AllLiteral'
}

export type CatharsisUnknownResult = ModifiableResult & {
  type: 'UnknownLiteral'
}

export type CatharsisFunctionResult = ModifiableResult & {
  type: 'FunctionType'
  params: CatharsisParseResult[]
  result?: CatharsisParseResult
  this?: CatharsisParseResult
  new?: CatharsisParseResult
}

export type CatharsisFieldResult = ModifiableResult & {
  type: 'FieldType'
  key: CatharsisParseResult
  value: CatharsisParseResult | undefined
}

export type CatharsisRecordResult = ModifiableResult & {
  type: 'RecordType'
  fields: CatharsisFieldResult[]
}

function makeName (value: string): CatharsisNameResult {
  const result: CatharsisNameResult = {
    type: 'NameExpression',
    name: value
  }
  if (reservedWords.includes(value)) {
    result.reservedWord = true
  }
  return result
}

const catharsisTransformRules: TransformRules<CatharsisParseResult> = {
  JsdocTypeOptional: (result, transform) => {
    const transformed = transform(result.element)
    transformed.optional = true
    return transformed
  },

  JsdocTypeNullable:(result, transform) => {
    const transformed = transform(result.element)
    transformed.nullable = true
    return transformed
  },

  JsdocTypeNotNullable:(result, transform) => {
    const transformed = transform(result.element)
    transformed.nullable = false
    return transformed
  },

  JsdocTypeVariadic: (result, transform) => {
    if (result.element === undefined) {
      throw new Error('dots without value are not allowed in catharsis mode')
    }
    const transformed = transform(result.element)
    transformed.repeatable = true
    return transformed
  },

  JsdocTypeAny: () => ({
    type: 'AllLiteral'
  }),

  JsdocTypeNull: () => ({
    type: 'NullLiteral'
  }),

  JsdocTypeStringValue: result => makeName(`${result.meta.quote}${result.value}${result.meta.quote}`),

  JsdocTypeUndefined: () => ({
    type: 'UndefinedLiteral'
  }),

  JsdocTypeUnknown: () => ({
    type: 'UnknownLiteral'
  }),

  JsdocTypeFunction: (result, transform) => {
    const params = extractSpecialParams(result)

    const transformed: CatharsisFunctionResult = {
      type: 'FunctionType',
      params: params.params.map(transform)
    }

    if (params.this !== undefined) {
      transformed.this = transform(params.this)
    }

    if (params.new !== undefined) {
      transformed.new = transform(params.new)
    }

    if (result.returnType !== undefined) {
      transformed.result = transform(result.returnType)
    }

    return transformed
  },

  JsdocTypeGeneric: (result, transform) => ({
    type: 'TypeApplication',
    applications: result.elements.map(o => transform(o)),
    expression: transform(result.left)
  }),

  JsdocTypeSpecialNamePath: result => {
    const quote = result.meta.quote ?? ''
    return makeName(result.specialType + ':' + quote + result.value + quote)
  },

  JsdocTypeName: result => makeName(result.value),

  JsdocTypeNumber: result => makeName(result.value.toString()),

  JsdocTypeObject: (result, transform) => {
    const transformed: CatharsisRecordResult = {
      type: 'RecordType',
      fields: []
    }
    for (const field of result.elements) {
      if (field.type !== 'JsdocTypeKeyValue') {
        transformed.fields.push({
          type: 'FieldType',
          key: transform(field),
          value: undefined
        })
      } else {
        transformed.fields.push(transform(field) as unknown as CatharsisFieldResult)
      }
    }

    return transformed
  },

  JsdocTypeUnion: (result, transform) => ({
    type: 'TypeUnion',
    elements: result.elements.map(e => transform(e))
  }),

  JsdocTypeKeyValue: (result, transform) => {
    if ('value' in result) {
      return {
        type: 'FieldType',
        key: makeName(`${result.meta.quote ?? ''}${result.value}${result.meta.quote ?? ''}`),
        value: result.right === undefined ? undefined : transform(result.right)
      }
    } else {
      return {
        type: 'FieldType',
        key: transform(result.left),
        value: transform(result.right)
      }
    }
  },

  JsdocTypeNamePath: (result, transform) => {
    const leftResult = transform(result.left) as CatharsisNameResult
    const rightResult = transform(result.right) as CatharsisNameResult

    return makeName(`${leftResult.name}${result.pathType}${rightResult.name}`)
  },

  JsdocTypeSymbol: result => {
    let value = ''

    let element = result.element
    let trailingDots = false

    if (element?.type === 'JsdocTypeVariadic') {
      if (element.meta.position === 'PREFIX') {
        value = '...'
      } else {
        trailingDots = true
      }
      element = element.element
    }

    if (element?.type === 'JsdocTypeName') {
      value += element.value
    } else if (element?.type === 'JsdocTypeNumber') {
      value += element.value.toString()
    }

    if (trailingDots) {
      value += '...'
    }

    return makeName(`${result.value}(${value})`)
  },

  JsdocTypeParenthesis: (result, transform) => transform(assertTerminal(result.element)),

  JsdocTypeImport: notAvailableTransform,
  JsdocTypeKeyof: notAvailableTransform,
  JsdocTypeTuple: notAvailableTransform,
  JsdocTypeTypeof: notAvailableTransform,
  JsdocTypeIntersection: notAvailableTransform
}

export function catharsisTransform (result: TerminalResult): CatharsisParseResult {
  return transform(catharsisTransformRules, result)
}
