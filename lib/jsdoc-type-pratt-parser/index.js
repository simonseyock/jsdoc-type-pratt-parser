(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.jtpp = {}));
}(this, (function (exports) { 'use strict';

    function tokenToString(token) {
        if (token.text !== undefined && token.text !== '') {
            return `'${token.type}' with value '${token.text}'`;
        }
        else {
            return `'${token.type}'`;
        }
    }
    class NoParsletFoundError extends Error {
        constructor(token) {
            super(`No parslet found for token: ${tokenToString(token)}`);
            this.token = token;
            Object.setPrototypeOf(this, NoParsletFoundError.prototype);
        }
        getToken() {
            return this.token;
        }
    }
    class EarlyEndOfParseError extends Error {
        constructor(token) {
            super(`The parsing ended early. The next token was: ${tokenToString(token)}`);
            this.token = token;
            Object.setPrototypeOf(this, EarlyEndOfParseError.prototype);
        }
        getToken() {
            return this.token;
        }
    }
    class UnexpectedTypeError extends Error {
        constructor(result) {
            super(`Unexpected type: '${result.type}'`);
            Object.setPrototypeOf(this, UnexpectedTypeError.prototype);
        }
    }
    // export class UnexpectedTokenError extends Error {
    //   private expected: Token
    //   private found: Token
    //
    //   constructor (expected: Token, found: Token) {
    //     super(`The parsing ended early. The next token was: ${tokenToString(token)}`)
    //
    //     this.token = token
    //
    //     Object.setPrototypeOf(this, EarlyEndOfParseError.prototype)
    //   }
    //
    //   getToken() {
    //     return this.token
    //   }
    // }

    function makePunctuationRule(type) {
        return text => {
            if (text.startsWith(type)) {
                return { type, text: type };
            }
            else {
                return null;
            }
        };
    }
    function getQuoted(text) {
        let position = 0;
        let char;
        const mark = text[0];
        let escaped = false;
        if (mark !== '\'' && mark !== '"') {
            return null;
        }
        while (position < text.length) {
            position++;
            char = text[position];
            if (!escaped && char === mark) {
                position++;
                break;
            }
            escaped = !escaped && char === '\\';
        }
        if (char !== mark) {
            throw new Error('Unterminated String');
        }
        return text.slice(0, position);
    }
    const identifierStartRegex = /[a-zA-Z]/;
    const identifierContinueRegex = /[a-zA-Z_\-0-9]/;
    function getIdentifier(text) {
        let char = text[0];
        if (!identifierStartRegex.test(char)) {
            return null;
        }
        let position = 1;
        do {
            char = text[position];
            if (!identifierContinueRegex.test(char)) {
                break;
            }
            position++;
        } while (position < text.length);
        if (position === 0) {
            return null;
        }
        return text.slice(0, position);
    }
    const numberRegex = /[0-9]/;
    function getNumber(text) {
        let position = 0;
        let char;
        do {
            char = text[position];
            if (!numberRegex.test(char)) {
                break;
            }
            position++;
        } while (position < text.length);
        if (position === 0) {
            return null;
        }
        return text.slice(0, position);
    }
    const identifierRule = text => {
        const value = getIdentifier(text);
        if (value == null) {
            return null;
        }
        return {
            type: 'Identifier',
            text: value
        };
    };
    function makeKeyWordRule(type) {
        return text => {
            if (!text.startsWith(type)) {
                return null;
            }
            const prepends = text[type.length];
            if (prepends !== undefined && identifierContinueRegex.test(prepends)) {
                return null;
            }
            return {
                type: type,
                text: type
            };
        };
    }
    const stringValueRule = text => {
        const value = getQuoted(text);
        if (value == null) {
            return null;
        }
        return {
            type: 'StringValue',
            text: value
        };
    };
    const eofRule = text => {
        if (text.length > 0) {
            return null;
        }
        return {
            type: 'EOF',
            text: ''
        };
    };
    const numberRule = text => {
        const value = getNumber(text);
        if (value === null) {
            return null;
        }
        return {
            type: 'Number',
            text: value
        };
    };
    const rules = [
        eofRule,
        makePunctuationRule('=>'),
        makePunctuationRule('('),
        makePunctuationRule(')'),
        makePunctuationRule('{'),
        makePunctuationRule('}'),
        makePunctuationRule('['),
        makePunctuationRule(']'),
        makePunctuationRule('|'),
        makePunctuationRule('&'),
        makePunctuationRule('<'),
        makePunctuationRule('>'),
        makePunctuationRule(','),
        makePunctuationRule('*'),
        makePunctuationRule('?'),
        makePunctuationRule('!'),
        makePunctuationRule('='),
        makePunctuationRule(':'),
        makePunctuationRule('...'),
        makePunctuationRule('.'),
        makePunctuationRule('#'),
        makePunctuationRule('~'),
        makePunctuationRule('/'),
        makePunctuationRule('@'),
        makeKeyWordRule('undefined'),
        makeKeyWordRule('null'),
        makeKeyWordRule('function'),
        makeKeyWordRule('this'),
        makeKeyWordRule('new'),
        makeKeyWordRule('module'),
        makeKeyWordRule('event'),
        makeKeyWordRule('external'),
        makeKeyWordRule('typeof'),
        makeKeyWordRule('keyof'),
        makeKeyWordRule('import'),
        identifierRule,
        stringValueRule,
        numberRule
    ];
    class Lexer {
        constructor() {
            this.text = '';
        }
        lex(text) {
            this.text = text;
            this.current = undefined;
            this.next = undefined;
            this.advance();
        }
        token() {
            if (this.current === undefined) {
                throw new Error('Lexer not lexing');
            }
            return this.current;
        }
        peek() {
            if (this.next === undefined) {
                this.next = this.read();
            }
            return this.next;
        }
        last() {
            return this.previous;
        }
        advance() {
            this.previous = this.current;
            if (this.next !== undefined) {
                this.current = this.next;
                this.next = undefined;
                return;
            }
            this.current = this.read();
        }
        read() {
            const text = this.text.trim();
            for (const rule of rules) {
                const token = rule(text);
                if (token !== null) {
                    this.text = text.slice(token.text.length);
                    return token;
                }
            }
            throw new Error('Unexpected Token');
        }
        clone() {
            const lexer = new Lexer();
            lexer.text = this.text;
            lexer.previous = this.previous === undefined ? undefined : {
                type: this.previous.type,
                text: this.previous.text
            };
            lexer.current = this.current === undefined ? undefined : {
                type: this.current.type,
                text: this.current.text
            };
            lexer.next = this.next === undefined ? undefined : {
                type: this.next.type,
                text: this.next.text
            };
            return lexer;
        }
    }

    function assertTerminal(result) {
        if (result === undefined) {
            throw new Error('Unexpected undefined');
        }
        if (result.type === 'KEY_VALUE' || result.type === 'NUMBER' || result.type === 'PARAMETER_LIST' || result.type === 'JSDOC_OBJECT_KEY_VALUE') {
            throw new UnexpectedTypeError(result);
        }
        return result;
    }
    function assertKeyValueOrTerminal(result) {
        if (result.type === 'KEY_VALUE') {
            return result;
        }
        return assertTerminal(result);
    }
    function assertKeyValueOrName(result) {
        if (result.type === 'KEY_VALUE') {
            return result;
        }
        else if (result.type !== 'NAME') {
            throw new UnexpectedTypeError(result);
        }
        return result;
    }
    function assertNumberOrVariadicName(result) {
        var _a;
        if (result.type === 'VARIADIC') {
            if (((_a = result.element) === null || _a === void 0 ? void 0 : _a.type) === 'NAME') {
                return result;
            }
            throw new UnexpectedTypeError(result);
        }
        if (result.type !== 'NUMBER' && result.type !== 'NAME') {
            throw new UnexpectedTypeError(result);
        }
        return result;
    }

    // higher precedence = higher importance
    var Precedence;
    (function (Precedence) {
        Precedence[Precedence["ALL"] = 0] = "ALL";
        Precedence[Precedence["PARAMETER_LIST"] = 1] = "PARAMETER_LIST";
        Precedence[Precedence["UNION"] = 2] = "UNION";
        Precedence[Precedence["INTERSECTION"] = 3] = "INTERSECTION";
        Precedence[Precedence["PREFIX"] = 4] = "PREFIX";
        Precedence[Precedence["POSTFIX"] = 5] = "POSTFIX";
        Precedence[Precedence["TUPLE"] = 6] = "TUPLE";
        Precedence[Precedence["OBJECT"] = 7] = "OBJECT";
        Precedence[Precedence["SYMBOL"] = 8] = "SYMBOL";
        Precedence[Precedence["OPTIONAL"] = 9] = "OPTIONAL";
        Precedence[Precedence["NULLABLE"] = 10] = "NULLABLE";
        Precedence[Precedence["KEY_OF_TYPE_OF"] = 11] = "KEY_OF_TYPE_OF";
        Precedence[Precedence["KEY_VALUE"] = 12] = "KEY_VALUE";
        Precedence[Precedence["FUNCTION"] = 13] = "FUNCTION";
        Precedence[Precedence["ARROW"] = 14] = "ARROW";
        Precedence[Precedence["GENERIC"] = 15] = "GENERIC";
        Precedence[Precedence["NAME_PATH"] = 16] = "NAME_PATH";
        Precedence[Precedence["ARRAY_BRACKETS"] = 17] = "ARRAY_BRACKETS";
        Precedence[Precedence["PARENTHESIS"] = 18] = "PARENTHESIS";
        Precedence[Precedence["SPECIAL_TYPES"] = 19] = "SPECIAL_TYPES";
    })(Precedence || (Precedence = {}));

    class ParserEngine {
        constructor(grammar) {
            this.lexer = new Lexer();
            const { prefixParslets, infixParslets } = grammar();
            this.prefixParslets = prefixParslets;
            this.infixParslets = infixParslets;
        }
        parseText(text) {
            this.lexer.lex(text);
            const result = this.parseType(Precedence.ALL);
            if (!this.consume('EOF')) {
                throw new EarlyEndOfParseError(this.getToken());
            }
            return result;
        }
        getPrefixParslet() {
            return this.prefixParslets.find(p => p.accepts(this.getToken().type, this.peekToken().type));
        }
        getInfixParslet(precedence) {
            return this.infixParslets.find(p => {
                return p.getPrecedence() > precedence && p.accepts(this.getToken().type, this.peekToken().type);
            });
        }
        tryParseType(precedence) {
            const preserve = this.lexer.clone();
            try {
                return this.parseIntermediateType(precedence);
            }
            catch (e) {
                if (e instanceof NoParsletFoundError) {
                    this.lexer = preserve;
                    return undefined;
                }
                else {
                    throw e;
                }
            }
        }
        parseType(precedence) {
            return assertTerminal(this.parseIntermediateType(precedence));
        }
        parseIntermediateType(precedence) {
            const pParslet = this.getPrefixParslet();
            if (pParslet === undefined) {
                throw new NoParsletFoundError(this.getToken());
            }
            let result = pParslet.parsePrefix(this);
            let iParslet = this.getInfixParslet(precedence);
            while (iParslet !== undefined) {
                result = iParslet.parseInfix(this, result);
                iParslet = this.getInfixParslet(precedence);
            }
            return result;
        }
        consume(type) {
            if (this.lexer.token().type !== type) {
                return false;
            }
            this.lexer.advance();
            return true;
        }
        getToken() {
            return this.lexer.token();
        }
        peekToken() {
            return this.lexer.peek();
        }
        previousToken() {
            return this.lexer.last();
        }
    }

    class SymbolParslet {
        accepts(type) {
            return type === '(';
        }
        getPrecedence() {
            return Precedence.SYMBOL;
        }
        parseInfix(parser, left) {
            if (left.type !== 'NAME') {
                throw new Error('Symbol expects a name on the left side. (Reacting on \'(\')');
            }
            parser.consume('(');
            const result = {
                type: 'SYMBOL',
                value: left.value
            };
            if (!parser.consume(')')) {
                const next = parser.parseIntermediateType(Precedence.SYMBOL);
                result.element = assertNumberOrVariadicName(next);
                if (!parser.consume(')')) {
                    throw new Error('Symbol does not end after value');
                }
            }
            return result;
        }
    }

    class ArrayBracketsParslet {
        accepts(type, next) {
            return type === '[' && next === ']';
        }
        getPrecedence() {
            return Precedence.ARRAY_BRACKETS;
        }
        parseInfix(parser, left) {
            parser.consume('[');
            parser.consume(']');
            return {
                type: 'GENERIC',
                left: {
                    type: 'NAME',
                    value: 'Array',
                    meta: {
                        reservedWord: false
                    }
                },
                elements: [
                    assertTerminal(left)
                ],
                meta: {
                    brackets: '[]',
                    dot: false
                }
            };
        }
    }

    class StringValueParslet {
        accepts(type) {
            return type === 'StringValue';
        }
        getPrecedence() {
            return Precedence.PREFIX;
        }
        parsePrefix(parser) {
            const token = parser.getToken();
            parser.consume('StringValue');
            return {
                type: 'STRING_VALUE',
                value: token.text.slice(1, -1),
                meta: {
                    quote: token.text[0]
                }
            };
        }
    }

    class BaseFunctionParslet {
        getParameters(value) {
            let parameters;
            if (value.type === 'PARAMETER_LIST') {
                parameters = value.elements;
            }
            else if (value.type === 'PARENTHESIS') {
                parameters = [value.element];
            }
            else {
                throw new UnexpectedTypeError(value);
            }
            return parameters.map(p => assertKeyValueOrTerminal(p));
        }
        getNamedParameters(value) {
            const parameters = this.getParameters(value);
            if (parameters.some(p => p.type !== 'KEY_VALUE')) {
                throw new Error('All parameters should be named');
            }
            return parameters;
        }
        getUnnamedParameters(value) {
            const parameters = this.getParameters(value);
            if (parameters.some(p => p.type === 'KEY_VALUE')) {
                throw new Error('No parameter should be named');
            }
            return parameters;
        }
    }

    class FunctionParslet extends BaseFunctionParslet {
        constructor(options) {
            super();
            this.allowWithoutParenthesis = options.allowWithoutParenthesis;
            this.allowNamedParameters = options.allowNamedParameters;
            this.allowNoReturnType = options.allowNoReturnType;
        }
        accepts(type) {
            return type === 'function';
        }
        getPrecedence() {
            return Precedence.FUNCTION;
        }
        parsePrefix(parser) {
            parser.consume('function');
            const hasParenthesis = parser.getToken().type === '(';
            if (!this.allowWithoutParenthesis && !hasParenthesis) {
                throw new Error('function is missing parameter list');
            }
            const result = {
                type: 'FUNCTION',
                parameters: [],
                arrow: false,
                parenthesis: hasParenthesis
            };
            if (hasParenthesis) {
                const value = parser.parseIntermediateType(Precedence.FUNCTION);
                if (this.allowNamedParameters === undefined) {
                    result.parameters = this.getUnnamedParameters(value);
                }
                else {
                    result.parameters = this.getParameters(value);
                    for (const p of result.parameters) {
                        if (p.type === 'KEY_VALUE' && (!this.allowNamedParameters.includes(p.value) || p.meta.quote !== undefined)) {
                            throw new Error(`only allowed named parameters are ${this.allowNamedParameters.join(',')} but got ${p.type}`);
                        }
                    }
                }
                if (parser.consume(':')) {
                    result.returnType = parser.parseType(Precedence.PREFIX);
                }
                else {
                    if (!this.allowNoReturnType) {
                        throw new Error('function is missing return type');
                    }
                }
            }
            return result;
        }
    }

    class UnionParslet {
        accepts(type) {
            return type === '|';
        }
        getPrecedence() {
            return Precedence.UNION;
        }
        parseInfix(parser, left) {
            parser.consume('|');
            const elements = [];
            do {
                elements.push(parser.parseType(Precedence.UNION));
            } while (parser.consume('|'));
            return {
                type: 'UNION',
                elements: [assertTerminal(left), ...elements]
            };
        }
    }

    function isQuestionMarkUnknownType(next) {
        return next === 'EOF' || next === '|' || next === ',' || next === ')' || next === '>';
    }

    class SpecialTypesParslet {
        accepts(type, next) {
            return (type === '?' && isQuestionMarkUnknownType(next)) || type === 'null' || type === 'undefined' || type === '*';
        }
        getPrecedence() {
            return Precedence.SPECIAL_TYPES;
        }
        parsePrefix(parser) {
            if (parser.consume('null')) {
                return {
                    type: 'NULL'
                };
            }
            if (parser.consume('undefined')) {
                return {
                    type: 'UNDEFINED'
                };
            }
            if (parser.consume('*')) {
                return {
                    type: 'ANY'
                };
            }
            if (parser.consume('?')) {
                return {
                    type: 'UNKNOWN'
                };
            }
            throw new Error('Unacceptable token: ' + parser.getToken().text);
        }
    }

    class GenericParslet {
        accepts(type, next) {
            return type === '<' || (type === '.' && next === '<');
        }
        getPrecedence() {
            return Precedence.GENERIC;
        }
        parseInfix(parser, left) {
            const dot = parser.consume('.');
            parser.consume('<');
            const objects = [];
            do {
                objects.push(parser.parseType(Precedence.PARAMETER_LIST));
            } while (parser.consume(','));
            if (!parser.consume('>')) {
                throw new Error('Unterminated generic parameter list');
            }
            return {
                type: 'GENERIC',
                left: assertTerminal(left),
                elements: objects,
                meta: {
                    brackets: '<>',
                    dot
                }
            };
        }
    }

    class ParenthesisParslet {
        accepts(type, next) {
            return type === '(';
        }
        getPrecedence() {
            return Precedence.PARENTHESIS;
        }
        parsePrefix(parser) {
            parser.consume('(');
            const result = parser.tryParseType(Precedence.ALL);
            if (!parser.consume(')')) {
                throw new Error('Unterminated parenthesis');
            }
            if (result === undefined) {
                return {
                    type: 'PARAMETER_LIST',
                    elements: []
                };
            }
            else if (result.type === 'PARAMETER_LIST') {
                return result;
            }
            else if (result.type === 'KEY_VALUE') {
                return {
                    type: 'PARAMETER_LIST',
                    elements: [result]
                };
            }
            return {
                type: 'PARENTHESIS',
                element: assertTerminal(result)
            };
        }
    }

    class NumberParslet {
        accepts(type, next) {
            return type === 'Number';
        }
        getPrecedence() {
            return Precedence.PREFIX;
        }
        parsePrefix(parser) {
            const token = parser.getToken();
            parser.consume('Number');
            return {
                type: 'NUMBER',
                value: parseInt(token.text, 10)
            };
        }
    }

    class ParameterListParslet {
        constructor(option) {
            this.allowTrailingComma = option.allowTrailingComma;
        }
        accepts(type, next) {
            return type === ',';
        }
        getPrecedence() {
            return Precedence.PARAMETER_LIST;
        }
        parseInfix(parser, left) {
            const elements = [
                assertKeyValueOrTerminal(left)
            ];
            parser.consume(',');
            do {
                try {
                    const next = parser.parseIntermediateType(Precedence.PARAMETER_LIST);
                    elements.push(assertKeyValueOrTerminal(next));
                }
                catch (e) {
                    if (this.allowTrailingComma && e instanceof NoParsletFoundError) {
                        break;
                    }
                    else {
                        throw e;
                    }
                }
            } while (parser.consume(','));
            if (elements.length > 0 && elements.slice(0, -1).some(e => e.type === 'VARIADIC')) {
                throw new Error('Only the last parameter may be a rest parameter');
            }
            return {
                type: 'PARAMETER_LIST',
                elements
            };
        }
    }

    class NullablePrefixParslet {
        accepts(type, next) {
            return type === '?' && !isQuestionMarkUnknownType(next);
        }
        getPrecedence() {
            return Precedence.NULLABLE;
        }
        parsePrefix(parser) {
            parser.consume('?');
            return {
                type: 'NULLABLE',
                element: parser.parseType(Precedence.NULLABLE),
                meta: {
                    position: 'PREFIX'
                }
            };
        }
    }
    class NullableInfixParslet {
        accepts(type, next) {
            return type === '?';
        }
        getPrecedence() {
            return Precedence.NULLABLE;
        }
        parseInfix(parser, left) {
            parser.consume('?');
            return {
                type: 'NULLABLE',
                element: assertTerminal(left),
                meta: {
                    position: 'SUFFIX'
                }
            };
        }
    }

    class OptionalParslet {
        accepts(type, next) {
            return type === '=';
        }
        getPrecedence() {
            return Precedence.OPTIONAL;
        }
        parsePrefix(parser) {
            parser.consume('=');
            return {
                type: 'OPTIONAL',
                element: parser.parseType(Precedence.OPTIONAL),
                meta: {
                    position: 'PREFIX'
                }
            };
        }
        parseInfix(parser, left) {
            parser.consume('=');
            return {
                type: 'OPTIONAL',
                element: assertTerminal(left),
                meta: {
                    position: 'SUFFIX'
                }
            };
        }
    }

    const baseGrammar = () => {
        return {
            prefixParslets: [
                new NullablePrefixParslet(),
                new OptionalParslet(),
                new NumberParslet(),
                new ParenthesisParslet(),
                new SpecialTypesParslet()
            ],
            infixParslets: [
                new ParameterListParslet({
                    allowTrailingComma: true
                }),
                new GenericParslet(),
                new UnionParslet(),
                new OptionalParslet(),
                new NullableInfixParslet()
            ]
        };
    };

    class NamePathParslet {
        constructor(opts) {
            this.allowJsdocNamePaths = opts.allowJsdocNamePaths;
            this.stringValueParslet = new StringValueParslet();
        }
        accepts(type, next) {
            return (type === '.' && next !== '<') || (this.allowJsdocNamePaths && (type === '~' || type === '#'));
        }
        getPrecedence() {
            return Precedence.NAME_PATH;
        }
        parseInfix(parser, left) {
            const type = parser.getToken().text;
            parser.consume('.') || parser.consume('~') || parser.consume('#');
            let next;
            if (parser.getToken().type === 'StringValue') {
                next = this.stringValueParslet.parsePrefix(parser);
            }
            else {
                next = parser.parseIntermediateType(Precedence.NAME_PATH);
                if (next.type !== 'NAME' && next.type !== 'NUMBER' && !(next.type === 'SPECIAL_NAME_PATH' && next.specialType === 'event')) {
                    throw new UnexpectedTypeError(next);
                }
            }
            return {
                type: 'NAME_PATH',
                left: assertTerminal(left),
                right: next,
                pathType: type
            };
        }
    }

    class KeyValueParslet {
        constructor(opts) {
            this.allowKeyTypes = opts.allowKeyTypes;
            this.allowOptional = opts.allowOptional;
        }
        accepts(type, next) {
            return type === ':';
        }
        getPrecedence() {
            return Precedence.KEY_VALUE;
        }
        parseInfix(parser, left) {
            let optional = false;
            if (this.allowOptional && left.type === 'NULLABLE') {
                optional = true;
                left = left.element;
            }
            if (left.type === 'NUMBER' || left.type === 'NAME' || left.type === 'STRING_VALUE') {
                parser.consume(':');
                let quote;
                if (left.type === 'STRING_VALUE') {
                    quote = left.meta.quote;
                }
                return {
                    type: 'KEY_VALUE',
                    value: left.value.toString(),
                    right: parser.parseType(Precedence.KEY_VALUE),
                    optional: optional,
                    meta: {
                        quote
                    }
                };
            }
            else {
                if (!this.allowKeyTypes) {
                    throw new UnexpectedTypeError(left);
                }
                parser.consume(':');
                return {
                    type: 'JSDOC_OBJECT_KEY_VALUE',
                    left: assertTerminal(left),
                    right: parser.parseType(Precedence.KEY_VALUE)
                };
            }
        }
    }

    class VariadicParslet {
        constructor(opts) {
            this.allowEnclosingBrackets = opts.allowEnclosingBrackets;
        }
        accepts(type) {
            return type === '...';
        }
        getPrecedence() {
            return Precedence.PREFIX;
        }
        parsePrefix(parser) {
            parser.consume('...');
            const brackets = this.allowEnclosingBrackets && parser.consume('[');
            const value = parser.tryParseType(Precedence.PREFIX);
            if (brackets && !parser.consume(']')) {
                throw new Error('Unterminated variadic type. Missing \']\'');
            }
            if (value !== undefined) {
                return {
                    type: 'VARIADIC',
                    element: assertTerminal(value),
                    meta: {
                        position: 'PREFIX',
                        squareBrackets: brackets
                    }
                };
            }
            else {
                return {
                    type: 'VARIADIC',
                    meta: {
                        position: 'ONLY_DOTS',
                        squareBrackets: false
                    }
                };
            }
        }
        parseInfix(parser, left) {
            parser.consume('...');
            return {
                type: 'VARIADIC',
                element: assertTerminal(left),
                meta: {
                    position: 'SUFFIX',
                    squareBrackets: false
                }
            };
        }
    }

    class SpecialNamePathParslet {
        accepts(type, next) {
            return type === 'module' || type === 'event' || type === 'external';
        }
        getPrecedence() {
            return Precedence.PREFIX;
        }
        parsePrefix(parser) {
            const type = parser.getToken().text;
            parser.consume('module') || parser.consume('event') || parser.consume('external');
            if (!parser.consume(':')) {
                return {
                    type: 'NAME',
                    value: type,
                    meta: {
                        reservedWord: false
                    }
                };
            }
            let token = parser.getToken();
            if (parser.consume('StringValue')) {
                return {
                    type: 'SPECIAL_NAME_PATH',
                    value: token.text.slice(1, -1),
                    specialType: type,
                    meta: {
                        quote: token.text[0]
                    }
                };
            }
            else {
                let result = '';
                const allowed = ['Identifier', '@', '/'];
                while (allowed.some(type => parser.consume(type))) {
                    result += token.text;
                    token = parser.getToken();
                }
                return {
                    type: 'SPECIAL_NAME_PATH',
                    value: result,
                    specialType: type,
                    meta: {
                        quote: undefined
                    }
                };
            }
        }
    }

    function transform(rules, parseResult) {
        const rule = rules[parseResult.type];
        if (rule === undefined) {
            throw new Error(`In this set of transform rules exists no rule for type ${parseResult.type}.`);
        }
        return rule(parseResult, aParseResult => transform(rules, aParseResult));
    }
    function notAvailableTransform(parseResult) {
        throw new Error('This transform is not available. Are you trying the correct parsing mode?');
    }
    function extractSpecialParams(source) {
        const result = {
            params: []
        };
        for (const param of source.parameters) {
            if (param.type === 'KEY_VALUE' && param.meta.quote === undefined) {
                if (param.value === 'this') {
                    result.this = param.right;
                }
                else if (param.value === 'new') {
                    result.new = param.right;
                }
                else {
                    result.params.push(param);
                }
            }
            else {
                result.params.push(param);
            }
        }
        return result;
    }

    const reservedWords = [
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
    ];
    function makeName(value) {
        const result = {
            type: 'NameExpression',
            name: value
        };
        if (reservedWords.includes(value)) {
            result.reservedWord = true;
        }
        return result;
    }
    const catharsisTransformRules = {
        OPTIONAL: (result, transform) => {
            const transformed = transform(result.element);
            transformed.optional = true;
            return transformed;
        },
        NULLABLE: (result, transform) => {
            const transformed = transform(result.element);
            transformed.nullable = true;
            return transformed;
        },
        NOT_NULLABLE: (result, transform) => {
            const transformed = transform(result.element);
            transformed.nullable = false;
            return transformed;
        },
        VARIADIC: (result, transform) => {
            if (result.element === undefined) {
                throw new Error('dots without value are not allowed in catharsis mode');
            }
            const transformed = transform(result.element);
            transformed.repeatable = true;
            return transformed;
        },
        ANY: () => ({
            type: 'AllLiteral'
        }),
        NULL: () => ({
            type: 'NullLiteral'
        }),
        STRING_VALUE: result => makeName(`${result.meta.quote}${result.value}${result.meta.quote}`),
        UNDEFINED: () => ({
            type: 'UndefinedLiteral'
        }),
        UNKNOWN: () => ({
            type: 'UnknownLiteral'
        }),
        FUNCTION: (result, transform) => {
            const params = extractSpecialParams(result);
            const transformed = {
                type: 'FunctionType',
                params: params.params.map(transform)
            };
            if (params.this !== undefined) {
                transformed.this = transform(params.this);
            }
            if (params.new !== undefined) {
                transformed.new = transform(params.new);
            }
            if (result.returnType !== undefined) {
                transformed.result = transform(result.returnType);
            }
            return transformed;
        },
        GENERIC: (result, transform) => ({
            type: 'TypeApplication',
            applications: result.elements.map(o => transform(o)),
            expression: transform(result.left)
        }),
        SPECIAL_NAME_PATH: result => {
            var _a;
            const quote = (_a = result.meta.quote) !== null && _a !== void 0 ? _a : '';
            return makeName(result.specialType + ':' + quote + result.value + quote);
        },
        NAME: result => makeName(result.value),
        NUMBER: result => makeName(result.value.toString()),
        OBJECT: (result, transform) => {
            const transformed = {
                type: 'RecordType',
                fields: []
            };
            for (const field of result.elements) {
                if (field.type !== 'KEY_VALUE' && field.type !== 'JSDOC_OBJECT_KEY_VALUE') {
                    transformed.fields.push({
                        type: 'FieldType',
                        key: transform(field),
                        value: undefined
                    });
                }
                else {
                    transformed.fields.push(transform(field));
                }
            }
            return transformed;
        },
        UNION: (result, transform) => ({
            type: 'TypeUnion',
            elements: result.elements.map(e => transform(e))
        }),
        KEY_VALUE: (result, transform) => {
            var _a, _b;
            return ({
                type: 'FieldType',
                key: makeName(`${(_a = result.meta.quote) !== null && _a !== void 0 ? _a : ''}${result.value}${(_b = result.meta.quote) !== null && _b !== void 0 ? _b : ''}`),
                value: result.right === undefined ? undefined : transform(result.right)
            });
        },
        NAME_PATH: (result, transform) => {
            const leftResult = transform(result.left);
            const rightResult = transform(result.right);
            return makeName(`${leftResult.name}${result.pathType}${rightResult.name}`);
        },
        SYMBOL: result => {
            let value = '';
            let element = result.element;
            let trailingDots = false;
            if ((element === null || element === void 0 ? void 0 : element.type) === 'VARIADIC') {
                if (element.meta.position === 'PREFIX') {
                    value = '...';
                }
                else {
                    trailingDots = true;
                }
                element = element.element;
            }
            if ((element === null || element === void 0 ? void 0 : element.type) === 'NAME') {
                value += element.value;
            }
            else if ((element === null || element === void 0 ? void 0 : element.type) === 'NUMBER') {
                value += element.value.toString();
            }
            if (trailingDots) {
                value += '...';
            }
            return makeName(`${result.value}(${value})`);
        },
        PARENTHESIS: (result, transform) => transform(assertTerminal(result.element)),
        JSDOC_OBJECT_KEY_VALUE: (result, transform) => ({
            type: 'FieldType',
            key: transform(result.left),
            value: transform(result.right)
        }),
        IMPORT: notAvailableTransform,
        KEY_OF: notAvailableTransform,
        TUPLE: notAvailableTransform,
        TYPE_OF: notAvailableTransform,
        INTERSECTION: notAvailableTransform
    };
    function catharsisTransform(result) {
        return transform(catharsisTransformRules, result);
    }

    class NameParslet {
        constructor(options) {
            this.allowedAdditionalTokens = options.allowedAdditionalTokens;
        }
        accepts(type, next) {
            return type === 'Identifier' || type === 'this' || type === 'new' || this.allowedAdditionalTokens.includes(type);
        }
        getPrecedence() {
            return Precedence.PREFIX;
        }
        parsePrefix(parser) {
            const token = parser.getToken();
            parser.consume('Identifier') || parser.consume('this') || parser.consume('new') ||
                this.allowedAdditionalTokens.some(type => parser.consume(type));
            return {
                type: 'NAME',
                value: token.text,
                meta: {
                    reservedWord: reservedWords.includes(token.text)
                }
            };
        }
    }

    class NotNullableParslet {
        accepts(type, next) {
            return type === '!';
        }
        getPrecedence() {
            return Precedence.NULLABLE;
        }
        parsePrefix(parser) {
            parser.consume('!');
            return {
                type: 'NOT_NULLABLE',
                element: parser.parseType(Precedence.NULLABLE),
                meta: {
                    position: 'PREFIX'
                }
            };
        }
        parseInfix(parser, left) {
            parser.consume('!');
            return {
                type: 'NOT_NULLABLE',
                element: assertTerminal(left),
                meta: {
                    position: 'SUFFIX'
                }
            };
        }
    }

    class ObjectParslet {
        constructor(opts) {
            this.allowKeyTypes = opts.allowKeyTypes;
        }
        accepts(type) {
            return type === '{';
        }
        getPrecedence() {
            return Precedence.OBJECT;
        }
        parsePrefix(parser) {
            parser.consume('{');
            const result = {
                type: 'OBJECT',
                elements: []
            };
            if (!parser.consume('}')) {
                do {
                    let field = parser.parseIntermediateType(Precedence.OBJECT);
                    let optional = false;
                    if (field.type === 'NULLABLE') {
                        optional = true;
                        field = field.element;
                    }
                    if (field.type === 'NUMBER' || field.type === 'NAME' || field.type === 'STRING_VALUE') {
                        let quote;
                        if (field.type === 'STRING_VALUE') {
                            quote = field.meta.quote;
                        }
                        result.elements.push({
                            type: 'KEY_VALUE',
                            value: field.value.toString(),
                            right: undefined,
                            optional: optional,
                            meta: {
                                quote
                            }
                        });
                    }
                    else if (field.type === 'KEY_VALUE' || field.type === 'JSDOC_OBJECT_KEY_VALUE') {
                        result.elements.push(field);
                    }
                    else {
                        throw new UnexpectedTypeError(field);
                    }
                } while (parser.consume(','));
                if (!parser.consume('}')) {
                    throw new Error('Unterminated record type. Missing \'}\'');
                }
            }
            return result;
        }
    }

    const jsdocGrammar = () => {
        const { prefixParslets, infixParslets } = baseGrammar();
        return {
            prefixParslets: [
                ...prefixParslets,
                new ObjectParslet({
                    allowKeyTypes: true
                }),
                new FunctionParslet({
                    allowWithoutParenthesis: true,
                    allowNamedParameters: ['this', 'new'],
                    allowNoReturnType: true
                }),
                new StringValueParslet(),
                new SpecialNamePathParslet(),
                new VariadicParslet({
                    allowEnclosingBrackets: true
                }),
                new NameParslet({
                    allowedAdditionalTokens: ['keyof']
                }),
                new NotNullableParslet()
            ],
            infixParslets: [
                ...infixParslets,
                new SymbolParslet(),
                new ArrayBracketsParslet(),
                new NamePathParslet({
                    allowJsdocNamePaths: true
                }),
                new KeyValueParslet({
                    allowKeyTypes: true,
                    allowOptional: false
                }),
                new VariadicParslet({
                    allowEnclosingBrackets: true
                }),
                new NotNullableParslet()
            ]
        };
    };

    class TypeOfParslet {
        accepts(type, next) {
            return type === 'typeof';
        }
        getPrecedence() {
            return Precedence.KEY_OF_TYPE_OF;
        }
        parsePrefix(parser) {
            parser.consume('typeof');
            return {
                type: 'TYPE_OF',
                element: assertTerminal(parser.parseType(Precedence.KEY_OF_TYPE_OF))
            };
        }
    }

    const closureGrammar = () => {
        const { prefixParslets, infixParslets } = baseGrammar();
        return {
            prefixParslets: [
                ...prefixParslets,
                new ObjectParslet({
                    allowKeyTypes: false
                }),
                new NameParslet({
                    allowedAdditionalTokens: ['module', 'event', 'external']
                }),
                new TypeOfParslet(),
                new FunctionParslet({
                    allowWithoutParenthesis: false,
                    allowNamedParameters: ['this', 'new'],
                    allowNoReturnType: true
                }),
                new VariadicParslet({
                    allowEnclosingBrackets: false
                }),
                new NameParslet({
                    allowedAdditionalTokens: ['keyof']
                }),
                new NotNullableParslet()
            ],
            infixParslets: [
                ...infixParslets,
                new NamePathParslet({
                    allowJsdocNamePaths: false
                }),
                new KeyValueParslet({
                    allowKeyTypes: false,
                    allowOptional: false
                }),
                new NotNullableParslet()
            ]
        };
    };

    class TupleParslet {
        constructor(opts) {
            this.allowQuestionMark = opts.allowQuestionMark;
        }
        accepts(type, next) {
            return type === '[';
        }
        getPrecedence() {
            return Precedence.TUPLE;
        }
        parsePrefix(parser) {
            parser.consume('[');
            const result = {
                type: 'TUPLE',
                elements: []
            };
            if (parser.consume(']')) {
                return result;
            }
            const typeList = parser.parseIntermediateType(Precedence.ALL);
            if (typeList.type === 'PARAMETER_LIST') {
                result.elements = typeList.elements.map(assertTerminal);
            }
            else {
                result.elements = [assertTerminal(typeList)];
            }
            if (!parser.consume(']')) {
                throw new Error('Unterminated \'[\'');
            }
            if (!this.allowQuestionMark && result.elements.some(e => e.type === 'UNKNOWN')) {
                throw new Error('Question mark in tuple not allowed');
            }
            return result;
        }
    }

    class KeyOfParslet {
        accepts(type, next) {
            return type === 'keyof';
        }
        getPrecedence() {
            return Precedence.KEY_OF_TYPE_OF;
        }
        parsePrefix(parser) {
            parser.consume('keyof');
            return {
                type: 'KEY_OF',
                element: assertTerminal(parser.parseType(Precedence.KEY_OF_TYPE_OF))
            };
        }
    }

    class ImportParslet {
        accepts(type, next) {
            return type === 'import';
        }
        getPrecedence() {
            return Precedence.PREFIX;
        }
        parsePrefix(parser) {
            parser.consume('import');
            if (!parser.consume('(')) {
                throw new Error('Missing parenthesis after import keyword');
            }
            const path = parser.parseType(Precedence.PREFIX);
            if (path.type !== 'STRING_VALUE') {
                throw new Error('Only string values are allowed as paths for imports');
            }
            if (!parser.consume(')')) {
                throw new Error('Missing closing parenthesis after import keyword');
            }
            return {
                type: 'IMPORT',
                element: path
            };
        }
    }

    class ArrowFunctionWithoutParametersParslet {
        accepts(type, next) {
            return type === '(' && next === ')';
        }
        getPrecedence() {
            return Precedence.ARROW;
        }
        parsePrefix(parser) {
            const hasParenthesis = parser.consume('(');
            parser.consume(')');
            if (!parser.consume('=>')) {
                throw new Error('Unexpected empty parenthesis. Expected \'=>\' afterwards.');
            }
            return {
                type: 'FUNCTION',
                parameters: [],
                arrow: true,
                parenthesis: hasParenthesis,
                returnType: parser.parseType(Precedence.ALL)
            };
        }
    }
    class ArrowFunctionWithParametersParslet extends BaseFunctionParslet {
        accepts(type, next) {
            return type === '=>';
        }
        getPrecedence() {
            return Precedence.ARROW;
        }
        parseInfix(parser, left) {
            parser.consume('=>');
            return {
                type: 'FUNCTION',
                parameters: this.getParameters(left).map(assertKeyValueOrName),
                arrow: true,
                parenthesis: true,
                returnType: parser.parseType(Precedence.ALL)
            };
        }
    }

    class IntersectionParslet {
        accepts(type) {
            return type === '&';
        }
        getPrecedence() {
            return Precedence.INTERSECTION;
        }
        parseInfix(parser, left) {
            parser.consume('&');
            const elements = [];
            do {
                elements.push(parser.parseType(Precedence.INTERSECTION));
            } while (parser.consume('&'));
            return {
                type: 'INTERSECTION',
                elements: [assertTerminal(left), ...elements]
            };
        }
    }

    const typescriptGrammar = () => {
        const { prefixParslets, infixParslets } = baseGrammar();
        // typescript does not support explicit non nullability
        // https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#patterns-that-are-known-not-to-be-supported
        // module seems not to be supported
        return {
            prefixParslets: [
                ...prefixParslets,
                new ObjectParslet({
                    allowKeyTypes: false
                }),
                new TypeOfParslet(),
                new KeyOfParslet(),
                new ImportParslet(),
                new StringValueParslet(),
                new ArrowFunctionWithoutParametersParslet(),
                new FunctionParslet({
                    allowWithoutParenthesis: false,
                    allowNoReturnType: false,
                    allowNamedParameters: ['this', 'new']
                }),
                new TupleParslet({
                    allowQuestionMark: false
                }),
                new VariadicParslet({
                    allowEnclosingBrackets: false
                }),
                new NameParslet({
                    allowedAdditionalTokens: ['module', 'event', 'external']
                })
            ],
            infixParslets: [
                ...infixParslets,
                new ArrayBracketsParslet(),
                new ArrowFunctionWithParametersParslet(),
                new NamePathParslet({
                    allowJsdocNamePaths: false
                }),
                new KeyValueParslet({
                    allowKeyTypes: false,
                    allowOptional: true
                }),
                new IntersectionParslet()
            ]
        };
    };

    const engines = {
        jsdoc: new ParserEngine(jsdocGrammar),
        closure: new ParserEngine(closureGrammar),
        typescript: new ParserEngine(typescriptGrammar)
    };
    /**
     * This function parses the given expression in the given mode and produces a {@link ParseResult}.
     * @param expression
     * @param mode
     */
    function parse(expression, mode) {
        return engines[mode].parseText(expression);
    }
    /**
     * This function tries to parse the given expression in multiple modes and returns the first successful
     * {@link ParseResult}. By default it tries `'typescript'`, `'closure'` and `'jsdoc'` in this order. If
     * no mode was successful it throws the error that was produced by the last parsing attempt.
     * @param expression
     * @param modes
     */
    function tryParse(expression, modes = ['typescript', 'closure', 'jsdoc']) {
        let error;
        for (const mode of modes) {
            try {
                return engines[mode].parseText(expression);
            }
            catch (e) {
                error = e;
            }
        }
        throw error;
    }

    function getQuoteStyle(quote) {
        switch (quote) {
            case undefined:
                return 'none';
            case '\'':
                return 'single';
            case '"':
                return 'double';
        }
    }
    function getMemberType(type) {
        switch (type) {
            case '~':
                return 'INNER_MEMBER';
            case '#':
                return 'INSTANCE_MEMBER';
            case '.':
                return 'MEMBER';
        }
    }
    function nestResults(type, results) {
        if (results.length === 2) {
            return {
                type,
                left: results[0],
                right: results[1]
            };
        }
        else {
            return {
                type,
                left: results[0],
                right: nestResults(type, results.slice(1))
            };
        }
    }
    const jtpRules = {
        OPTIONAL: (result, transform) => ({
            type: 'OPTIONAL',
            value: transform(result.element),
            meta: {
                syntax: result.meta.position === 'PREFIX' ? 'PREFIX_EQUAL_SIGN' : 'SUFFIX_EQUALS_SIGN'
            }
        }),
        NULLABLE: (result, transform) => ({
            type: 'NULLABLE',
            value: transform(result.element),
            meta: {
                syntax: result.meta.position === 'PREFIX' ? 'PREFIX_QUESTION_MARK' : 'SUFFIX_QUESTION_MARK'
            }
        }),
        NOT_NULLABLE: (result, transform) => ({
            type: 'NOT_NULLABLE',
            value: transform(result.element),
            meta: {
                syntax: result.meta.position === 'PREFIX' ? 'PREFIX_BANG' : 'SUFFIX_BANG'
            }
        }),
        VARIADIC: (result, transform) => {
            const transformed = {
                type: 'VARIADIC',
                meta: {
                    syntax: result.meta.position === 'PREFIX' ? 'PREFIX_DOTS'
                        : result.meta.position === 'SUFFIX' ? 'SUFFIX_DOTS' : 'ONLY_DOTS'
                }
            };
            if (result.element !== undefined) {
                transformed.value = transform(result.element);
            }
            return transformed;
        },
        NAME: result => ({
            type: 'NAME',
            name: result.value
        }),
        TYPE_OF: (result, transform) => ({
            type: 'TYPE_QUERY',
            name: transform(result.element)
        }),
        TUPLE: (result, transform) => ({
            type: 'TUPLE',
            entries: result.elements.map(transform)
        }),
        KEY_OF: (result, transform) => ({
            type: 'KEY_QUERY',
            value: transform(result.element)
        }),
        IMPORT: result => ({
            type: 'IMPORT',
            path: {
                type: 'STRING_VALUE',
                quoteStyle: getQuoteStyle(result.element.meta.quote),
                string: result.element.value
            }
        }),
        UNDEFINED: () => ({
            type: 'NAME',
            name: 'undefined'
        }),
        ANY: () => ({
            type: 'ANY'
        }),
        FUNCTION: (result, transform) => {
            const specialParams = extractSpecialParams(result);
            const transformed = {
                type: result.arrow ? 'ARROW' : 'FUNCTION',
                params: specialParams.params.map(param => {
                    if (param.type === 'KEY_VALUE') {
                        if (param.right === undefined) {
                            throw new Error('Function parameter without \':\' is not expected to be \'KEY_VALUE\'');
                        }
                        return {
                            type: 'NAMED_PARAMETER',
                            name: param.value,
                            typeName: transform(param.right)
                        };
                    }
                    else {
                        return transform(param);
                    }
                }),
                new: null,
                returns: null
            };
            if (specialParams.this !== undefined) {
                transformed.this = transform(specialParams.this);
            }
            else if (!result.arrow) {
                transformed.this = null;
            }
            if (specialParams.new !== undefined) {
                transformed.new = transform(specialParams.new);
            }
            if (result.returnType !== undefined) {
                transformed.returns = transform(result.returnType);
            }
            return transformed;
        },
        GENERIC: (result, transform) => {
            const transformed = {
                type: 'GENERIC',
                subject: transform(result.left),
                objects: result.elements.map(transform),
                meta: {
                    syntax: result.meta.brackets === '[]' ? 'SQUARE_BRACKET' : result.meta.dot ? 'ANGLE_BRACKET_WITH_DOT' : 'ANGLE_BRACKET'
                }
            };
            if (result.meta.brackets === '[]' && result.elements[0].type === 'FUNCTION' && !result.elements[0].parenthesis) {
                transformed.objects[0] = {
                    type: 'NAME',
                    name: 'function'
                };
            }
            return transformed;
        },
        KEY_VALUE: (result, transform) => {
            if (result.right === undefined) {
                return {
                    type: 'RECORD_ENTRY',
                    key: result.value.toString(),
                    quoteStyle: getQuoteStyle(result.meta.quote),
                    value: null,
                    readonly: false
                };
            }
            let right = transform(result.right);
            if (result.optional) {
                right = {
                    type: 'OPTIONAL',
                    value: right,
                    meta: {
                        syntax: 'SUFFIX_KEY_QUESTION_MARK'
                    }
                };
            }
            return {
                type: 'RECORD_ENTRY',
                key: result.value.toString(),
                quoteStyle: getQuoteStyle(result.meta.quote),
                value: right,
                readonly: false
            };
        },
        OBJECT: (result, transform) => {
            const entries = [];
            for (const field of result.elements) {
                if (field.type === 'KEY_VALUE') {
                    entries.push(transform(field));
                }
                else if (field.type === 'JSDOC_OBJECT_KEY_VALUE') {
                    throw new Error(`jsdoctypeparser does not support type ${field.type} at this point`);
                }
            }
            return {
                type: 'RECORD',
                entries
            };
        },
        SPECIAL_NAME_PATH: result => {
            if (result.specialType !== 'module') {
                throw new Error(`jsdoctypeparser does not support type ${result.specialType} at this point.`);
            }
            return {
                type: 'MODULE',
                value: {
                    type: 'FILE_PATH',
                    quoteStyle: getQuoteStyle(result.meta.quote),
                    path: result.value
                }
            };
        },
        NAME_PATH: (result, transform) => {
            let hasEventPrefix = false;
            let name;
            let quoteStyle;
            if (result.right.type === 'SPECIAL_NAME_PATH' && result.right.specialType === 'event') {
                hasEventPrefix = true;
                name = result.right.value;
                quoteStyle = getQuoteStyle(result.right.meta.quote);
            }
            else {
                name = `${result.right.value}`;
                quoteStyle = result.right.type === 'STRING_VALUE' ? getQuoteStyle(result.right.meta.quote) : 'none';
            }
            const transformed = {
                type: getMemberType(result.pathType),
                owner: transform(result.left),
                name,
                quoteStyle,
                hasEventPrefix
            };
            if (transformed.owner.type === 'MODULE') {
                const tModule = transformed.owner;
                transformed.owner = transformed.owner.value;
                tModule.value = transformed;
                return tModule;
            }
            else {
                return transformed;
            }
        },
        UNION: (result, transform) => nestResults('UNION', result.elements.map(transform)),
        PARENTHESIS: (result, transform) => ({
            type: 'PARENTHESIS',
            value: transform(assertTerminal(result.element))
        }),
        NULL: () => ({
            type: 'NAME',
            name: 'null'
        }),
        UNKNOWN: () => ({
            type: 'UNKNOWN'
        }),
        STRING_VALUE: result => ({
            type: 'STRING_VALUE',
            quoteStyle: getQuoteStyle(result.meta.quote),
            string: result.value
        }),
        INTERSECTION: (result, transform) => nestResults('INTERSECTION', result.elements.map(transform)),
        JSDOC_OBJECT_KEY_VALUE: notAvailableTransform,
        NUMBER: notAvailableTransform,
        SYMBOL: notAvailableTransform
    };
    function jtpTransform(result) {
        return transform(jtpRules, result);
    }

    function applyPosition(position, target, value) {
        return position === 'PREFIX' ? value + target : target + value;
    }
    function stringifyRules() {
        return {
            PARENTHESIS: (result, transform) => `(${result.element !== undefined ? transform(result.element) : ''})`,
            KEY_OF: (result, transform) => `keyof ${transform(result.element)}`,
            FUNCTION: (result, transform) => {
                if (!result.arrow) {
                    let stringified = 'function';
                    if (!result.parenthesis) {
                        return stringified;
                    }
                    stringified += `(${result.parameters.map(transform).join(', ')})`;
                    if (result.returnType !== undefined) {
                        stringified += `: ${transform(result.returnType)}`;
                    }
                    return stringified;
                }
                else {
                    if (result.returnType === undefined) {
                        throw new Error('Arrow function needs a return type.');
                    }
                    return `(${result.parameters.map(transform).join(', ')}) => ${transform(result.returnType)}`;
                }
            },
            NAME: result => result.value,
            TUPLE: (result, transform) => `[${result.elements.map(transform).join(', ')}]`,
            VARIADIC: (result, transform) => result.meta.position === 'ONLY_DOTS'
                ? '...'
                : applyPosition(result.meta.position, transform(result.element), '...'),
            NAME_PATH: (result, transform) => `${transform(result.left)}${result.pathType}${transform(result.right)}`,
            STRING_VALUE: result => `${result.meta.quote}${result.value}${result.meta.quote}`,
            ANY: () => '*',
            GENERIC: (result, transform) => {
                if (result.meta.brackets === '[]') {
                    const element = result.elements[0];
                    const transformed = transform(element);
                    if (element.type === 'UNION' || element.type === 'INTERSECTION') {
                        return `(${transformed})[]`;
                    }
                    else {
                        return `${transformed}[]`;
                    }
                }
                else {
                    return `${transform(result.left)}${result.meta.dot ? '.' : ''}<${result.elements.map(transform).join(', ')}>`;
                }
            },
            IMPORT: (result, transform) => `import(${transform(result.element)})`,
            KEY_VALUE: (result, transform) => {
                var _a, _b;
                const left = `${(_a = result.meta.quote) !== null && _a !== void 0 ? _a : ''}${result.value}${(_b = result.meta.quote) !== null && _b !== void 0 ? _b : ''}${result.optional ? '?' : ''}`;
                if (result.right === undefined) {
                    return left;
                }
                else {
                    return left + `: ${transform(result.right)}`;
                }
            },
            SPECIAL_NAME_PATH: result => { var _a, _b; return `${result.specialType}:${(_a = result.meta.quote) !== null && _a !== void 0 ? _a : ''}${result.value}${(_b = result.meta.quote) !== null && _b !== void 0 ? _b : ''}`; },
            NOT_NULLABLE: (result, transform) => applyPosition(result.meta.position, transform(result.element), '!'),
            NULL: () => 'null',
            NULLABLE: (result, transform) => applyPosition(result.meta.position, transform(result.element), '?'),
            NUMBER: result => result.value.toString(),
            OBJECT: (result, transform) => `{${result.elements.map(transform).join(', ')}}`,
            OPTIONAL: (result, transform) => applyPosition(result.meta.position, transform(result.element), '='),
            SYMBOL: (result, transform) => `${result.value}(${result.element !== undefined ? transform(result.element) : ''})`,
            TYPE_OF: (result, transform) => `typeof ${transform(result.element)}`,
            UNDEFINED: () => 'undefined',
            UNION: (result, transform) => result.elements.map(transform).join(' | '),
            UNKNOWN: () => '?',
            INTERSECTION: (result, transform) => result.elements.map(transform).join(' & '),
            JSDOC_OBJECT_KEY_VALUE: (result, transform) => `${transform(result.left)}: ${transform(result.right)}`
        };
    }
    const storedStringifyRules = stringifyRules();
    function stringify(result) {
        return transform(storedStringifyRules, result);
    }

    function identityTransformRules() {
        return {
            INTERSECTION: (result, transform) => ({
                type: 'INTERSECTION',
                elements: result.elements.map(transform)
            }),
            GENERIC: (result, transform) => ({
                type: 'GENERIC',
                left: transform(result.left),
                elements: result.elements.map(transform),
                meta: {
                    dot: result.meta.dot,
                    brackets: result.meta.brackets
                }
            }),
            NULLABLE: result => result,
            UNION: (result, transform) => ({
                type: 'UNION',
                elements: result.elements.map(transform)
            }),
            UNKNOWN: result => result,
            UNDEFINED: result => result,
            TYPE_OF: (result, transform) => ({
                type: 'TYPE_OF',
                element: transform(result.element)
            }),
            SYMBOL: (result, transform) => {
                const transformed = {
                    type: 'SYMBOL',
                    value: result.value
                };
                if (result.element !== undefined) {
                    transformed.element = transform(result.element);
                }
                return transformed;
            },
            OPTIONAL: (result, transform) => ({
                type: 'OPTIONAL',
                element: transform(result.element),
                meta: {
                    position: result.meta.position
                }
            }),
            OBJECT: (result, transform) => ({
                type: 'OBJECT',
                elements: result.elements.map(transform)
            }),
            NUMBER: result => result,
            NULL: result => result,
            NOT_NULLABLE: (result, transform) => ({
                type: 'NOT_NULLABLE',
                element: transform(result.element),
                meta: {
                    position: result.meta.position
                }
            }),
            SPECIAL_NAME_PATH: result => result,
            KEY_VALUE: (result, transform) => ({
                type: 'KEY_VALUE',
                value: result.value,
                right: result.right === undefined ? undefined : transform(result.right),
                optional: result.optional,
                meta: result.meta
            }),
            IMPORT: (result, transform) => ({
                type: 'IMPORT',
                element: transform(result.element)
            }),
            ANY: result => result,
            STRING_VALUE: result => result,
            NAME_PATH: result => result,
            VARIADIC: (result, transform) => {
                const transformed = {
                    type: 'VARIADIC',
                    meta: {
                        position: result.meta.position,
                        squareBrackets: result.meta.squareBrackets
                    }
                };
                if (result.element !== undefined) {
                    transformed.element = transform(result.element);
                }
                return transformed;
            },
            TUPLE: (result, transform) => ({
                type: 'TUPLE',
                elements: result.elements.map(transform)
            }),
            NAME: result => result,
            FUNCTION: (result, transform) => {
                const transformed = {
                    type: 'FUNCTION',
                    arrow: result.arrow,
                    parameters: result.parameters.map(transform),
                    parenthesis: result.parenthesis
                };
                if (result.returnType !== undefined) {
                    transformed.returnType = transform(result.returnType);
                }
                return transformed;
            },
            KEY_OF: (result, transform) => ({
                type: 'KEY_OF',
                element: transform(result.element)
            }),
            PARENTHESIS: (result, transform) => ({
                type: 'PARENTHESIS',
                element: transform(result.element)
            }),
            JSDOC_OBJECT_KEY_VALUE: (result, transform) => ({
                type: 'JSDOC_OBJECT_KEY_VALUE',
                left: transform(result.left),
                right: transform(result.right)
            })
        };
    }

    function _traverse(node, parentNode, property, onEnter, onLeave) {
        onEnter === null || onEnter === void 0 ? void 0 : onEnter(node, parentNode, property);
        if ('left' in node && node.left !== undefined) {
            _traverse(node.left, node, 'left', onEnter, onLeave);
        }
        if ('element' in node && node.element !== undefined) {
            _traverse(node.element, node, 'element', onEnter, onLeave);
        }
        if ('elements' in node && node.elements !== undefined) {
            for (const element of node.elements) {
                _traverse(element, node, 'elements', onEnter, onLeave);
            }
        }
        if ('parameters' in node && node.parameters !== undefined) {
            for (const param of node.parameters) {
                _traverse(param, node, 'parameters', onEnter, onLeave);
            }
        }
        if ('right' in node && node.right !== undefined) {
            _traverse(node.right, node, 'right', onEnter, onLeave);
        }
        if ('returnType' in node && node.returnType !== undefined) {
            _traverse(node.returnType, node, 'returnType', onEnter, onLeave);
        }
        onLeave === null || onLeave === void 0 ? void 0 : onLeave(node, parentNode, property);
    }
    function traverse(node, onEnter, onLeave) {
        _traverse(node, undefined, undefined, onEnter, onLeave);
    }

    exports.catharsisTransform = catharsisTransform;
    exports.identityTransformRules = identityTransformRules;
    exports.jtpTransform = jtpTransform;
    exports.parse = parse;
    exports.stringify = stringify;
    exports.stringifyRules = stringifyRules;
    exports.transform = transform;
    exports.traverse = traverse;
    exports.tryParse = tryParse;

    Object.defineProperty(exports, '__esModule', { value: true });

})));