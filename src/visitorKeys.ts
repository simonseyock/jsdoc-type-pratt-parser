import { NonTerminalResult } from './result/NonTerminalResult'

type VisitorKeys = {
  [P in NonTerminalResult as P['type']]: Array<keyof P>
}

export const visitorKeys: VisitorKeys = {
  JsdocTypeAny: [],
  JsdocTypeFunction: ['parameters', 'returnType'],
  JsdocTypeGeneric: ['left', 'elements'],
  JsdocTypeImport: [],
  JsdocTypeIntersection: ['elements'],
  JsdocTypeKeyof: ['element'],
  JsdocTypeKeyValue: ['right'],
  JsdocTypeName: [],
  JsdocTypeNamePath: ['left', 'right'],
  JsdocTypeNotNullable: ['element'],
  JsdocTypeNull: [],
  JsdocTypeNullable: ['element'],
  JsdocTypeNumber: [],
  JsdocTypeObject: ['elements'],
  JsdocTypeOptional: ['element'],
  JsdocTypeParenthesis: ['element'],
  JsdocTypeSpecialNamePath: [],
  JsdocTypeStringValue: [],
  JsdocTypeSymbol: ['element'],
  JsdocTypeTuple: ['elements'],
  JsdocTypeTypeof: ['element'],
  JsdocTypeUndefined: [],
  JsdocTypeUnion: ['elements'],
  JsdocTypeUnknown: [],
  JsdocTypeVariadic: ['element'],
  JsdocTypeProperty: []
}
