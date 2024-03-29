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
import {cur_s2n, log_info, read_text_file} from "../common.ts";
import {
	Date,
	OpenLedger,
	Ledger,
	NODE_DATE,
	NODE_OPEN_LEDGER,
	NODE_INCLUDE_FILE,
	NODE_INCLUDE_JOURNAL,
	IncludeFile,
	IncludeJournal,
	UseAccount,
	NODE_USE_ACCOUNT,
	Entry,
	JournalEntry, build_accounts, resolve_amount_type, entry,
} from "./ast.ts";
import {CharStream, cs_peek, cs_next, cs_loc, cs_new} from './cs.ts';
import {read_date, read_directive, read_number, read_string, read_text, skip_comment, skip_ws} from "./lex.ts";

function parse_date(cs: CharStream): Date {
	const x = read_date(cs);
	return {
		type: NODE_DATE,
		loc: x.loc,
		date: x.lexeme,
	};
}

function parse_entries(cs: CharStream): Entry[] {
	const xs: Entry[] = [];
	while (!cs.eof) {
		const a = cur_s2n(read_number(cs).lexeme);
		const b = read_text(cs).lexeme;
		const amount_type = resolve_amount_type(b);
		xs.push(entry(b, a, amount_type));

		skip_comment(cs);
		if (cs_peek(cs) === '\n') {
			cs_next(cs);
			if (cs_peek(cs) === '\n') {
				cs_next(cs);
				break;
			}
		}
	}
	return xs;
}

function parse_open_ledger(cs: CharStream): OpenLedger {
	const loc = cs_loc(cs, cs.index);
	const xs = parse_entries(cs);
	return {type: NODE_OPEN_LEDGER, loc: loc, xs: xs};
}

function parse_use_account(cs: CharStream): UseAccount {
	const x = read_text(cs)
	return {type: NODE_USE_ACCOUNT, loc: x.loc, account: x.lexeme};
}

function parse_directive(cs: CharStream) {
	const x = read_directive(cs);
	switch (x.lexeme) {
		case 'open': {
			const x = read_directive(cs);
			switch (x.lexeme) {
				case 'ledger': return parse_open_ledger(cs);
				default: throw new Error(x.lexeme);
			}
		}
		case 'use': {
			const x = read_directive(cs);
			switch (x.lexeme) {
				case 'account': return parse_use_account(cs);
				default: throw new Error(x.lexeme);
			}
		}
		case 'include': {
			const x = read_string(cs);
			return {
				type: NODE_INCLUDE_FILE,
				loc: x.loc,
				file: x.lexeme,
			};
		}
		case 'journal': {
			const x = read_string(cs);
			return {
				type: NODE_INCLUDE_JOURNAL,
				loc: x.loc,
				file: x.lexeme,
			};
		}
		default: throw new Error(x.lexeme);
	}
}

interface CurrentState {
	date: string,
	account: string,
}

function ledger_unposted_last(lg: Ledger) {
	return lg.unposted[lg.unposted.length-1];
}

function parse_journal_entry(xs: Entry[], lg: Ledger, current: CurrentState) {
	const add_je = (x: JournalEntry) => {
		const last = ledger_unposted_last(lg);
		if (last && last.date > current.date) throw new Error(`Postings not in sequence: ${last.date} > ${current.date}}`);
		lg.unposted.push(x);
	};

	if (current.account) {
		xs.forEach(e => add_je({date: current.date, xs: [e, entry(current.account, e.amount, e.amount_type === "D" ? "C" : "D")]}));
	}
	else {
		add_je({date: current.date, xs: xs});
	}
	current.date = '';
}

function resolve_path(old_file: string, new_file: string) {
	let x = old_file;
	let n = x.lastIndexOf('/');
	if (n == -1) return new_file;
	return x.substring(0, n+1)+new_file;
}

function do_parse(file: string, lg: Ledger) {
	log_info(`Parsing: ${file}`);
	const cs = cs_new(read_text_file(file));

	let current = {
		date: '',
		account: '',
	};

	while (!cs.eof) {
		const x = cs_peek(cs);
		if (x === ';' || x === '\n') {
			skip_ws(cs);
		}
		else if (x === '-') {
			parse_journal_entry(parse_entries(cs), lg, current);
		}
		else if ((x >= '0' && x <= '9')) {
			if (current.date) {
				parse_journal_entry(parse_entries(cs), lg, current);
			}
			else {
				const y = parse_date(cs);
				if (!lg.start_date) lg.start_date = y.date;
				current.date = y.date;
			}
		}
		else if ((x >= 'a' && x <= 'z') || (x >= 'A' && x <= 'Z')) {
			const y = parse_directive(cs);
			switch (y.type) {
				case NODE_OPEN_LEDGER: build_accounts(y as OpenLedger, lg); break;
				case NODE_USE_ACCOUNT: current.account = (y as UseAccount).account; break;
				case NODE_INCLUDE_JOURNAL: {
					const lgx = {
						start_date: lg.start_date,
						end_date: lg.end_date,
						accounts: lg.accounts,
						unposted: [],
					};
					do_parse(resolve_path(file, (y as IncludeJournal).file), lgx);
					lg.unposted = lg.unposted.concat(lgx.unposted);
					break;
				}
				case NODE_INCLUDE_FILE: {
					do_parse(resolve_path(file, (y as IncludeFile).file), lg);
					break;
				}
				default: throw new Error(`type: ${y.type}`);
			}
		}
		else {
			throw new Error(`#${x}@`);
		}
	}
}

export function parse(file: string): Ledger {
	const lg: Ledger = {
		start_date: '',
		end_date: '',
		accounts: [],
		unposted: [],
	};
	do_parse(file, lg);
	lg.unposted = lg.unposted.sort((a, b) => a.date <= b.date ? -1 : 1);
	const last = lg.unposted[lg.unposted.length-1];
	lg.end_date = last ? last.date : lg.end_date;
	return lg;
}