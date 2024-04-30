/**
 * Copyright (C) 2024 Sieve
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 **/
import {CharacterStream, TokenStream} from "@sieve/nonstd/data";
type TokenType = "DIRECTIVE" | "DATE" | "NUMBER" | "ACCOUNT" | "STRING";

interface Token {
    type: TokenType;
    index: number;
    lexeme: string;
}

function token(cs: CharacterStream, type: TokenType, start: number, end?: number) {
    end = end || cs.get_index();
    return { type: type, index: start, lexeme: cs.substring(start, end)};
}

function skip_comment(cs: CharacterStream) {
    while (!cs.eof()) {
        cs.next();
        if (cs.peek() === '\n') break;
    }
}

function lex_error(cs: CharacterStream, n: number, x: string) {
    const [line,character] = cs.get_line_and_character(n);
    const y = cs.substring(n, cs.get_index()).trim();
    return new Error(`"${y}" : ${x} (${cs.name}:${line}:${character})`);
}

function read_date_or_number(cs: CharacterStream): Token {
    const n = cs.get_index();
    cs.next(); // skip -ve sign or 0-9 or DOT or COMMA
    while (!cs.eof()) {
        const x = cs.peek();
        if ((x >= '0' && x <= '9') || x === '.' || x === ',' || x === '-') {
            cs.next();
        }
        else {
            break;
        }
    }
    const x = token(cs, "NUMBER", n);
    if (/^\d{4}-\d{2}-\d{2}$/.test(x.lexeme)) {
        x.type = "DATE";
    }
    else if (/^-?[\d,]+(?:\.\d{2})?$/.test(x.lexeme)) {
        x.type = "NUMBER";
    }
    else {
        throw lex_error(cs, n, "NOT A DATE/NUMBER");
    }
    return x;
}

function read_directive(cs: CharacterStream): Token {
    const n = cs.get_index();
    while (!cs.eof()) {
        const x = cs.peek();
        if (x === ' ' || (x >= 'a' && x <= 'z')) {
            cs.next();
        }
        else {
            break;
        }
    }
    const x = token(cs, "DIRECTIVE", n);
    x.lexeme = x.lexeme.trim();
    return x;
}

function read_account(cs: CharacterStream): Token {
    const n = cs.get_index();
    while (!cs.eof()) {
        const x = cs.peek();
        if (x === ';' || x === '\t' || x === '\n' || x === ' ') break;
        cs.next();
    }
    return token(cs, "ACCOUNT", n);
}

function read_string(cs: CharacterStream): Token {
    const n = cs.get_index();
    cs.next();
    while (!cs.eof()) {
        const x = cs.next();
        if (x === '"') break;
    }
    const a =  token(cs, "STRING", n);
    a.lexeme = a.lexeme.substring(1, a.lexeme.length-1);
    return a;
}

export {TokenStream, type Token};

export function lex(file: string, x: string): TokenStream<Token> {
    const cs = new CharacterStream(x.replace(/\r\n?/g, "\n"), file);

    const xs: Token[] = [];
    while (true) {
        cs.skip_ws();
        if (cs.eof()) break;
        const n = cs.get_index();
        const x = cs.peek();

        if (x === ';') {
            skip_comment(cs);
        }
        else if (x === '-' || (x >= '0' && x <= '9')) {
            xs.push(read_date_or_number(cs));
        }
        else if (x >= 'a' && x <= 'z') {
            xs.push(read_directive(cs));
        }
        else if (x >= 'A' && x <= 'Z') {
            xs.push(read_account(cs));
        }
        else if (x >= '"') {
            xs.push(read_string(cs));
        }
        else {
            throw lex_error(cs, n, "INVALID CHARACTER: "+x);
        }
    }
    return new TokenStream(xs, file);
}