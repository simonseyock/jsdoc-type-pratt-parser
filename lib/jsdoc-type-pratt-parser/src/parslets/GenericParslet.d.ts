import { TokenType } from '../lexer/Token';
import { InfixParslet } from './Parslet';
import { Precedence } from '../Precedence';
import { Parser } from '../Parser';
import { IntermediateResult } from '../result/IntermediateResult';
import { TerminalResult } from '../result/TerminalResult';
export declare class GenericParslet implements InfixParslet {
    accepts(type: TokenType, next: TokenType): boolean;
    getPrecedence(): Precedence;
    parseInfix(parser: Parser, left: IntermediateResult): TerminalResult;
}
