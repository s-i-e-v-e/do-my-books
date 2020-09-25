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
	JournalEntry,
	entry,
	fix_entry,
	fix_account
} from './ast.ts'

export function total(xs: number[]) {
	return xs.reduce((a, b) => a + b, 0);
}

function resolve_account(lg: Ledger, name: string) {
	const x = lg.accounts.filter(a => a.name === name)[0];
	if (!x) throw new Error(`Unknown account: ${name}`);
	return x;
}

function check_entry(lg: Ledger, e: JournalEntry, map: StringMap) {
	const xs = e.xs;
	const ys = xs.filter(x => x.debit === x.credit);
	if (ys.length > 1) throw new Error();
	const unbalanced = ys[0];
	let sum = total(xs.map(x => x.debit - x.credit));
	if (unbalanced) {
		unbalanced.debit = -sum;
		unbalanced.credit = -sum;
		fix_entry(map.get(unbalanced.account)!, unbalanced);
		sum += unbalanced.debit - unbalanced.credit;
	}
	if (sum) throw new Error(`Unbalanced entry on ${e.date}. Diff: ${sum}`);
}

function post_entries(lg: Ledger, map: StringMap) {
	lg.unposted.forEach(je => {
		// check accounts
		const accounts = je.xs.map(e => resolve_account(lg, e.account));

		// fix entries
		je.xs.forEach(e => fix_entry(map.get(e.account)!, e));

		check_entry(lg, je, map);

		const ys: Entry[] = [];
		je.xs.forEach(e => {
			// combine, if same account appears multiple times in an entry
			const y = ys.filter(y => y.account === e.account)[0];
			if (y) {
				y.debit += e.debit;
				y.credit += e.credit;
			}
			else {
				ys.push(e);

				// post entry
				const a = resolve_account(lg, e.account);
				a.xs.push({date: je.date, xs: ys});
			}
		});
	});
}

function check_opening_balances(lg: Ledger) {
	const sum = total(lg.accounts.map(x => x.opening_debit - x.opening_credit));
	if (sum) throw new Error(`opening balance mismatch: ${sum}`);
}

function check_closing_balances(lg: Ledger) {
	const ys: Entry[] = lg.accounts.map(x => {
		const xs = x.xs
			.map(y => y.xs)
			.reduce((a, b) => a.concat(b), [])
			.filter(y => y.account === x.name);
		return entry(x.name, x.opening_debit + total(xs.map(y => y.debit)), x.opening_credit + total(xs.map(y => y.credit)));
	});

	const sum = total(ys.map(x => x.debit - x.credit));
	if (sum) throw new Error(`closing balance mismatch: ${sum}`);
}

type StringMap = Map<string, string>;
export function check(lg: Ledger) {
	const map = new Map<string, string>();
	lg.accounts.forEach(x => {
		map.set(x.name, x.type);
		fix_account(x);
	});
	check_opening_balances(lg);
	post_entries(lg, map);
	check_closing_balances(lg);
	lg.unposted = [];
	return lg;
}