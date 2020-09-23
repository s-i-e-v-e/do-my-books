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

export function cur_s2n(n: string) {
	n = n.replace(',', '');
	const xs = n.split('.');

	switch (xs.length) {
		case 1: n += '00'; break;
		case 2: {
			if (xs[1].length != 2) throw new Error(n);
			n = n.replace('.', '');
			break;
		}
		default: throw new Error(n);
	}

	const y = Number(n);
	if (isNaN(y)) throw new Error(n);
	return y;
}

export function cur_n2s(n: number) {
	const a = n/100|0;
	const b = Math.abs(n%100);
	return `${a}.${b < 10 ? '0' : ''}${b}`;
}

export function debug() {
	try { throw new Error();} catch(e) {}
}

export function println(x: string) {
	console.log(x);
}

export function read_text_file(file: string) {
	return Deno.readTextFileSync(file).trim().replaceAll(/\r?\n/g, '\n').replaceAll(/\t/g, ' ');
}

export function write_text_file(file: string, contents: string) {
	return Deno.writeTextFileSync(file, contents);
}