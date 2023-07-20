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

export type AccountType = "CAPITAL" | "ASSETS" | "LIABILITIES" | "INCOMES" | "EXPENSES";
export type AmountType = "D" | "C";
export interface Entry {
	account: string,
	amount: number,
	amount_type: AmountType,
	value: number
}

export interface JournalEntry {
	date: string,
	xs: Entry[], /* sum of entries should be 0 */
}

export interface Account {
	name: string,
	type: AccountType,
	balance: number,
	amount_type: AmountType,
	value: number,
	xs: JournalEntry[],
}

export interface Ledger {
	start_date: string,
	end_date: string,
	accounts: Account[],
	unposted: JournalEntry[],
}

export function entry(name: string, amount: number, amount_type: AmountType): Entry {
	return {account: name, amount: amount, amount_type: amount_type, value: amount_type === "D" ? amount : -amount};
}

function to_account_type(account: string) {
	return account.substring(0, account.indexOf('/')).toUpperCase() as AccountType;
}

export function resolve_amount_type(name: string): AmountType {
	const account_type = to_account_type(name);

	switch (account_type) {
		case "ASSETS" :
		case "EXPENSES": {
			return "D";
		}
		case "CAPITAL":
		case "LIABILITIES":
		case "INCOMES": {
			return "C";
		}
		default: {
			throw new Error(`${name}: ${account_type}`);
		}
	}
}

export function build_accounts(x: OpenLedger, lg: Ledger) {
	if (lg.accounts.length) throw new Error('cannot reopen ledger');
	x.xs.forEach(p => {
		const a: Account = {
			name: p.account,
			type: to_account_type(p.account),
			balance: p.amount,
			amount_type: p.amount_type,
			value: p.amount_type === "D" ? p.amount : -p.amount,
			xs: [],
		};
		lg.accounts.push(a);
	});
}