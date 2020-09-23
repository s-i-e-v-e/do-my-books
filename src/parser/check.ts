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
import {
	Posting,
	Ledger,
	JournalEntry,
	TYPE_CAPITAL,
	TYPE_LIABILITIES,
	TYPE_INCOMES
} from './ast.ts'

export function total(xs: number[]) {
	return xs.reduce((a, b) => a + b, 0);
}

function amount(type: string, n: number) {
	return (type === TYPE_CAPITAL || type === TYPE_LIABILITIES || type === TYPE_INCOMES) ? -n : n;
}

function resolve_account(lg: Ledger, name: string) {
	const x = lg.accounts.filter(a => a.name === name)[0];
	if (!x) throw new Error(`Unknown account: ${name}`);
	return x;
}

function check_entry(lg: Ledger, e: JournalEntry, map: StringMap) {
	const xs = e.xs;
	const last = xs.filter(x => x.account[0] === '@')[0];
	let sum;
	if (last) {
		const name = last.account;
		last.account = name[0] === '@' ? name.substring(1) : name;

		sum = total(xs.map(x => amount(map.get(x.account)!, x.amount)));
		if (sum) {
			last.amount = name[0] === '@' ? amount(map.get(last.account)!, -sum) : last.amount;
			sum += name[0] === '@' ? last.amount : 0;
		}
	}
	else {
		sum = total(xs.map(x => amount(map.get(x.account)!, x.amount)));
	}
	xs.forEach(x => resolve_account(lg, x.account));
	if (sum) throw new Error(`Unbalanced entry on ${e.date}. Diff: ${sum}`);
}

function post_entries(lg: Ledger, map: StringMap) {
	lg.unposted.forEach(e => {
		check_entry(lg, e, map);

		const ys: Posting[] = [];
		e.xs.forEach(x => {
			// combine, if same account appears multiple times in an entry
			const y = ys.filter(y => y.account === x.account)[0];
			if (y) {
				y.amount += x.amount;
			}
			else {
				ys.push(x);
			}
		});

		ys
			.map(x => resolve_account(lg, x.account))
			.forEach(x => x.xs.push({date: e.date, xs: ys}));
	});
}

function check_opening_balances(lg: Ledger) {
	const sum = total(lg.accounts.map(x => amount(x.type, x.opening)));
	if (sum) throw new Error(`opening balance mismatch: ${sum}`);
}

function check_closing_balances(lg: Ledger) {
	const ys = lg.accounts.map(x => {
		const xs = x.xs
			.map(y => y.xs)
			.reduce((a, b) => a.concat(b), [])
			.filter(y => y.account === x.name);
		const closing = x.opening + total(xs.map(y => y.amount));
		return {name: x.name, opening: closing, type: x.type, xs: []};
	});

	const sum = total(ys.map(x => amount(x.type, x.opening)));
	if (sum) throw new Error(`closing balance mismatch: ${sum}`);
}

type StringMap = Map<string, string>;
export function check(lg: Ledger) {
	const map = new Map<string, string>();
	lg.accounts.forEach(x => map.set(x.name, x.type));
	check_opening_balances(lg);
	post_entries(lg, map);
	check_closing_balances(lg);
	lg.unposted = [];
	return lg;
}