import { InfixParslet } from './Parslet';
import { Token, TokenType } from '../lexer/Token';
import { Parser } from '../Parser';
import { ParseResult } from '../ParseResult';
import { Precedence } from './Precedence';

export class OptionalParslet implements InfixParslet {
    accepts(type: TokenType): boolean {
        return type === '=';
    }

    getPrecedence(): number {
        return Precedence.POSTFIX;
    }

    parse(parser: Parser, left: ParseResult, token: Token): ParseResult {
        parser.consume('=');
        left.optional = true;
        return left;
    }

}
