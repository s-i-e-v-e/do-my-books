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
	xs: Entry[],
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
const TYPE_CAPITAL = "CAPITAL";
const TYPE_ASSETS = "ASSETS";
const TYPE_LIABILITIES = "LIABILITIES";
const TYPE_INCOMES = "INCOMES";
const TYPE_EXPENSES = "EXPENSES";

export interface Entry {
	account: string,
	debit: number,
	credit: number,
}

export interface JournalEntry {
	date: string,
	xs: Entry[], /* sum of entries should be 0 */
}

export interface Account {
	name: string,
	type: string,
	opening_debit: number,
	opening_credit: number,
	xs: JournalEntry[],
}

export interface Ledger {
	start_date: string,
	end_date: string,
	accounts: Account[],
	unposted: JournalEntry[],
}

export function account(name: string, type: string, d: number, c: number): Account {
	return {name: name, type: type, opening_debit: d, opening_credit: c, xs: []};
}

export function entry(name: string, d: number, c: number): Entry {
	return {account: name, debit: d, credit: c};
}

export function fix_account(x: Account) {
	const e = entry(x.name, x.opening_debit, x.opening_credit);
	fix_entry(x.type, e);
	x.opening_debit = e.debit;
	x.opening_credit = e.credit;
	return x;
}

export function fix_entry(type: string, e: Entry) {
	const n = e.debit;
	switch (type) {
		case TYPE_ASSETS:
		case TYPE_EXPENSES: {
			if (n < 0) {
				e.debit = 0;
				e.credit = -n;
			} else {
				e.debit = n;
				e.credit = 0;
			}
			break;
		}
		case TYPE_CAPITAL:
		case TYPE_LIABILITIES:
		case TYPE_INCOMES: {
			if (n < 0) {
				e.debit = -n;
				e.credit = 0;

			} else {
				e.debit = 0;
				e.credit = n;
			}
			break;
		}
		default:
			throw new Error();
	}
	return e;
}