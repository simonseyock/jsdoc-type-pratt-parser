// higher precedence = higher importance
export enum Precedence {
  ALL,
  PARAMETER_LIST,
  OBJECT,
  KEY_VALUE,
  UNION,
  INTERSECTION,
  PREFIX,
  POSTFIX,
  TUPLE,
  SYMBOL,
  OPTIONAL,
  NULLABLE,
  KEY_OF_TYPE_OF,
  FUNCTION,
  ARROW,
  GENERIC,
  NAME_PATH,
  ARRAY_BRACKETS,
  PARENTHESIS,
  SPECIAL_TYPES
}
