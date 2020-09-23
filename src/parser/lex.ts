/**
 * Copyright (C) 2020 Sieve
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
import {CharStream, Location, cs_peek, cs_next, cs_loc} from './ast.ts';

export const DIRECTIVE = "DIRECTIVE";
export const DATE = "DATE";
export const NUMBER = "NUMBER";
export const STRING = "STRING";
export const TEXT = "TEXT";
export const SYM = "SYM";

export interface Token {
	loc: Location,
	type: string,
	lexeme: string,
}

export function skip_comment(cs: CharStream, x?: string) {
	x = x || cs_peek(cs);
	if (x === ';') {
		// skip comment
		while (!cs.eof) {
			const x = cs_next(cs);
			if (x === '\n') break;
		}
		cs.index--;
	}
}

export function skip_ws(cs: CharStream) {
	while (!cs.eof) {
		const x = cs_peek(cs);
		if (x === ' ' || x === '\n') {
			cs_next(cs);
		}
		else if (x === ';') {
			skip_comment(cs, x);
		}
		else {
			break;
		}
	}
}

function build_token(cs: CharStream, type: string, start: number, end?: number) {
	end = end || cs.index;
	return { loc: cs_loc(cs, start), lexeme: cs.x.substring(start, end), type: type};
}
export function read_date(cs: CharStream): Token {
	skip_ws(cs);
	const index = cs.index;

	const read_digit = (x: string) => { if (x >= '0' && x <= '9') {return x; } else { throw new Error(x) } }
	const read_sep = (x: string) => { if (x === '-' || x === '/') {return x; } else { throw new Error(x) } }

	let n = 0;
	while (!cs.eof && n < 10) {
		const x = cs_next(cs);
		if (n < 4) {
			read_digit(x);
		}
		else if (n === 4) {
			read_sep(x)
		}
		else if (n < 7) {
			read_digit(x);
		}
		else if (n === 7) {
			read_sep(x)
		}
		else if (n < 10) {
			read_digit(x);
		}
		n += 1;
	}
	return build_token(cs, DATE, index);
}

export function read_number(cs: CharStream): Token {
	skip_ws(cs);
	const index = cs.index;
	cs_next(cs);
	while (!cs.eof) {
		const x = cs_peek(cs);
		if ((x >= '0' && x <= '9') || x === '.' || x === ',') {
			cs_next(cs);
		}
		else {
			break;
		}
	}
	return build_token(cs, NUMBER, index);
}

export function read_directive(cs: CharStream): Token {
	skip_ws(cs);
	const index = cs.index;
	while (!cs.eof) {
		const x = cs_peek(cs);
		if (!(x === '-' || (x >= 'a' && x <= 'z'))) break;
		cs_next(cs);
	}
	return build_token(cs, DIRECTIVE, index);
}

export function read_string(cs: CharStream): Token {
	skip_ws(cs);
	if (cs_next(cs) !== '"') throw new Error();
	const index = cs.index;
	while (!cs.eof) {
		const x = cs_next(cs);
		if (x === '"') break;
	}
	return build_token(cs, STRING, index, cs.index-1);
}

export function read_text(cs: CharStream): Token {
	skip_ws(cs);
	const index = cs.index;
	while (!cs.eof) {
		const x = cs_peek(cs);
		if (x === ';' || x === '\t' || x === '\n' || x === ' ') break;
		cs_next(cs);
	}
	return build_token(cs, TEXT, index);
}