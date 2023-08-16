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
	Ledger,
} from "../parser/ast.ts";
import {cur_n2s} from "../common.ts";
import {total} from "../parser/check.ts";

interface BalanceEntry {
	account: string,
	debit: number,
	credit: number,
	value: number,
}

function balance_entry(account: string, debit: number, credit: number) {
	return {
		account: account,
		debit: debit,
		credit: credit,
		value: debit - credit,
	};
}

export function do_balances(lg: Ledger) {
	const xs = lg.accounts
		.sort((a, b) => a.name <= b.name ? -1 : 1)
		.map(a => [a.name, cur_n2s(a.balance), cur_n2s(a.balance)]);

	const dn = xs.map(x => x[1].length).reduce((a, b) => Math.max(a, b), 0);
	const cn = xs.map(x => x[2].length).reduce((a, b) => Math.max(a, b), 0);
	xs.forEach(x => {
		let name = x[0];
		let d = x[1];
		let c = x[2];
		d = `${' '.repeat(dn - d.length)}${d}`;
		c = `${' '.repeat(cn - c.length)}${c}`;
		console.log(`${name}\t${d}\t${c}`);
	});
}

export function do_trial_balance(type: string,lg: Ledger) {
	const build_table = (xs: BalanceEntry[]) => {
		const ys: string[][] = [];
		let da;
		let ca;
		let ds = 0;
		let cs = 0;
		xs.forEach(x => {
			da = cur_n2s(x.debit);
			ca = cur_n2s(x.credit);
			ds += x.debit;
			cs += x.credit;
			ys.push([x.account, da, ca]);
		})
		ys.push(['Totals', cur_n2s(ds), cur_n2s(cs)]);
		return ys;
	};

	const get_balances = (lg: Ledger, only_opening: boolean = false) => {
		const xs = lg.accounts
			.sort((a, b) => a.name <= b.name ? -1 : 1)
			.map(x => {
				let da;
				let ca;
				switch (x.amount_type) {
					case "D": {
						da = x.value;
						ca = 0;
						break;
					}
					case "C": {
						da = 0;
						ca = -x.value;
						break;
					}
					default: throw new Error();
				}
				return balance_entry(x.name, da, ca);
			});

		if (only_opening) return [xs, [], []];

		// transactions
		const ys = lg.accounts.map(x => {
			const xs = x.xs
				.map(y => y.xs)
				.reduce((a, b) => a.concat(b), [])
				.filter(y => y.account === x.name);

			const ds = total(xs.filter(y => y.value >= 0).map(y => y.value));
			const cs = total(xs.filter(y => y.value < 0).map(y => -y.value));

			return balance_entry(x.name, ds, cs);
		});

		// closing balances
		let zs = xs.map((x, i) => {
			const value = x.value + ys[i].value;
			const ds = value >= 0 ? value : 0;
			const cs = value < 0 ? -value : 0;

			return balance_entry(x.account, ds, cs);
		});
		return [xs, ys, zs];
	};

	switch (type) {
		case 'o': {
			const [xs,,] = get_balances(lg, true);
			console.log('Trial Balance\t\t');
			console.log(`Account\t${lg.start_date}\t`);
			console.log(`\tDebit\tCredit`);
			const xss = build_table(xs);
			xss.forEach(xs => {
				console.log(`${xs[0]}\t${xs[1]}\t${xs[2]}`);
			});
			break;
		}
		case 'c': {
			const [, , xs] = get_balances(lg);
			console.log('Trial Balance\t\t');
			console.log(`Account\t${lg.end_date}\t`);
			console.log(`\tDebit\tCredit`);
			const xss = build_table(xs);
			xss.forEach(xs => {
				console.log(`${xs[0]}\t${xs[1]}\t${xs[2]}`);
			});
			break;
		}
		case 'oc': {
			const [xs, , zs] = get_balances(lg);

			console.log('Trial Balance\t\t');
			console.log(`Account\t${lg.start_date}\t\t${lg.end_date}\t`);
			console.log(`\tDebit\tCredit\tDebit\tCredit`);
			const xss = build_table(xs);
			const zss = build_table(zs);
			xss.forEach((xs, i) => {
				const zs = zss[i];
				console.log(`${xs[0]}\t${xs[1]}\t${xs[2]}\t${zs[1]}\t${zs[2]}`);
			});
			break;
		}
		case 'otc': {
			const [xs, ys, zs] = get_balances(lg);

			console.log('Trial Balance\t\t\t\t');
			console.log(`Account\t${lg.start_date}\t\tTransactions\t\t${lg.end_date}\t`);
			console.log(`\tDebit\tCredit\tDebit\tCredit\tDebit\tCredit`);
			const xss = build_table(xs);
			const yss = build_table(ys);
			const zss = build_table(zs);
			xss.forEach((xs, i) => {
				const ys = yss[i];
				const zs = zss[i];
				console.log(`${xs[0]}\t${xs[1]}\t${xs[2]}\t${ys[1]}\t${ys[2]}\t${zs[1]}\t${zs[2]}`);
			});
			break;
		}
		default: throw new Error();
	}
}