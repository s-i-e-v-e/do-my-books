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
import {Ledger} from "../parser/ast.ts";
import {cur_n2s} from "../common.ts";

export function do_balances(lg: Ledger) {
	const xs = lg.accounts
		.sort((a, b) => a.name <= b.name ? -1 : 1)
		.map(a => [cur_n2s(a.opening), a.name]);

	const n = xs.map(x => x[0].length).reduce((a, b) => Math.max(a, b), 0);
	xs.forEach(x => {
		x[0] = `${' '.repeat(n - x[0].length)}${x[0]}`;
		console.log(`${x[0]}\t${x[1]}`);
	});
}