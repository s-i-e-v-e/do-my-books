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
export interface CharStream {
	x: string,
	index: number,
	line_indexes: number[],
	eof: boolean,
}

export interface Location {
	row: number,
	col: number,
}

export const NODE_DATE = 1;
export const NODE_INCLUDE_FILE = 2;
export const NODE_INCLUDE_JOURNAL = 3;
export const NODE_OPEN_LEDGER = 4;
export const NODE_USE_ACCOUNT = 5;

export interface Node {
	loc: Location,
	type: number,
}

export interface Date extends Node {
	date: string,
}

export interface OpenLedger extends Node {
	xs: Posting[],
}

export interface IncludeFile extends Node {
	file: string,
}

export interface IncludeJournal extends Node {
	file: string,
}

export interface UseAccount extends Node {
	account: string,
}

//
export const TYPE_CAPITAL = "CAPITAL";
export const TYPE_ASSETS = "ASSETS";
export const TYPE_LIABILITIES = "LIABILITIES";
export const TYPE_INCOMES = "INCOMES";
export const TYPE_EXPENSES = "EXPENSES";

export interface Posting {
	account: string,
	amount: number,
}

export interface JournalEntry {
	date: string,
	xs: Posting[], /* sum of postings should be 0 */
}

export interface Account {
	name: string,
	type: string,
	opening: number,
	xs: JournalEntry[],
}

export interface Ledger {
	start_date: string,
	accounts: Account[],
	unposted: JournalEntry[],
}

export function cs_new(x: string) {
	x =	x.replaceAll(/\t/g, ' ');
	x =	x.replaceAll(/[ ]*\n[ ]+\n[ ]*/g, '\n\n');

	const cs: CharStream = {
		x: x,
		index: 0,
		line_indexes: [],
		eof: false,
	};
	cs.line_indexes.push(cs.index);
	return cs;
}

export function cs_peek(cs: CharStream) {
	return cs.x[cs.index];
}

export function cs_next(cs: CharStream) {
	const x = cs_peek(cs);
	cs.index += 1;
	cs.eof = cs.index >= cs.x.length;
	if (x === '\n') cs.line_indexes.push(cs.index-1);
	return x;
}

export function cs_loc(cs: CharStream, index: number) {
	let idx = cs.line_indexes.length-1;
	for (let i = 0; i < cs.line_indexes.length; i++) {
		const x = cs.line_indexes[i];
		if (x > index) {
			idx = i-1;
			break;
		}
	}
	const n = cs.line_indexes[idx];
	return {
		row: idx,
		col: index - n,
	};
}