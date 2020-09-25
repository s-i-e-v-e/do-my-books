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
import {println, read_text_file} from "./common.ts";
import {parse} from "./parser/parse.ts";
import {do_balances, do_trial_balance} from "./tools/report.ts";

function version() {
	println('dmb 0.1');
	println('Copyright (C) 2020 Sieve (https://github.com/s-i-e-v-e)');
	println('This is free software; see the source for copying conditions.  There is NO');
	println('warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.');
}

function help() {
	version();
	println('Usage:');
	println('help,    --help,          Display this information.');
	println('version, --version        Display version information.');
	println('balances file             List ledger balances');
	println('tb type file              Print trial balance. type can be one of:');
	println('                          o (opening)');
	println('                          c (closing)');
	println('                          oc (opening + closing)');
	println('                          otc (opening + transactions + closing)');
}

function balances(file: string) {
	do_balances(parse(file, read_text_file));
}

function trial_balance(type: string, file: string) {
	do_trial_balance(type, parse(file, read_text_file));
}

export function main(args: string[]) {
	const cmd = args[0];
	switch(cmd) {
		case "balances": balances(args[1]); break;
		case "tb": trial_balance(args[1], args[2]); break;
		case "--version":
		case "version": version(); break;
		case "--help":
		case "help":
		default: help(); break;
	}
}

if (import.meta.main) main(Deno.args);