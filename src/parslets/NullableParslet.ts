import { InfixParslet, PrefixParslet } from './Parslet';
import { Token, TokenType } from '../lexer/Token';
import { Parser } from '../Parser';
import { ParseResult } from '../ParseResult';

export class NullableParslet implements PrefixParslet {
    accepts(type: TokenType): boolean {
        return type === '?';
    }

    parse(parser: Parser, token: Token): ParseResult {
        parser.consume('?');
        const value = parser.parseType();
        if (value.nullable !== undefined) {
            throw new Error('Multiple nullable modifiers on same type');
        }
        value.nullable = true;
        return value;
    }
}

export class PostfixNullableParslet implements InfixParslet {
    accepts(type: TokenType): boolean {
        return type === '?';
    }

    parse(parser: Parser, left: ParseResult, token: Token): ParseResult {
        parser.consume('?');
        if (left.nullable !== undefined) {
            throw new Error('Multiple nullable modifiers on same type');
        }
        left.nullable = true;
        return left;
    }
}