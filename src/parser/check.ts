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
	Entry,
	Ledger,
	entry,
} from './ast.ts'

export function total(xs: number[]) {
	return xs.reduce((a, b) => a + b, 0);
}

function resolve_account(lg: Ledger, name: string) {
	const x = lg.accounts.filter(a => a.name === name)[0];
	if (!x) throw new Error(`Unknown account: ${name}`);
	return x;
}

function post_entries(lg: Ledger, map: StringMap) {
	lg.unposted.forEach(je => {
		// check accounts
		je.xs.forEach(e => resolve_account(lg, e.account));

		const sum = total(je.xs.map(x => x.value));
		if (sum) throw new Error(`Unbalanced entry on ${je.date}. Diff: ${sum}`);

		const set = new Set();
		je.xs.forEach(e => {
			const a = resolve_account(lg, e.account);
			if (!set.has(a.name)) {
				a.xs.push(je);
				set.add(a.name);
			}
		});
	});
}

function check_opening_balances(lg: Ledger) {
	const sum = total(lg.accounts.map(x => x.value));
	if (sum) throw new Error(`opening balance mismatch: ${sum}`);
}

function check_closing_balances(lg: Ledger) {
	const ys: Entry[] = lg.accounts.map(x => {
		const xs = x.xs
			.map(y => y.xs)
			.reduce((a, b) => a.concat(b), [])
			.filter(y => y.account === x.name);

		return entry(x.name, x.value + total(xs.map(y => y.value)), "D");
	});

	const sum = total(ys.map(x => x.amount));
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