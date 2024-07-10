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
import {cur_s2n, log_info, string_sort} from "../common.ts";
import {fs_read_utf8 } from "@sieve/nonstd/os";

import {
    Ledger,
    Entry,
    JournalEntry, build_accounts, resolve_amount_type, entry, OpenLedger, reverse_type,
} from "../parser/ast.ts";
import {CharacterStream} from "@sieve/nonstd/data";
import {TokenStream, Token, lex} from "./lex.ts";

interface ParseError extends Error {
    t: Token;
}

function parse_open_ledger(ts: TokenStream<Token>) {
    const xs = parse_entries(ts);
    return {xs: xs};
}

function resolve_path(old_file: string, new_file: string) {
    const x = old_file;
    const n = x.lastIndexOf('/');
    if (n == -1) return new_file;
    return x.substring(0, n+1)+new_file;
}

function build_error_string(source: string, t: Token, file: string, x: string) {
    const cs = new CharacterStream(source.replace(/\r\n?/g, "\n"), file);
    const [line,character] = cs.get_line_and_character(t.index);
    const y = cs.substring(t.index, t.index+20).trim();
    return `"${y}" : ${x} (${cs.name}:${line}:${character})`;
}

function parse_error(t: Token) {
    throw {
        t: t,
    } as ParseError;
}

function parse_directive(ts: TokenStream<Token>, lg: Ledger, file: string, current: CurrentState) {
    const x = ts.next();
    switch (x.lexeme) {
        case 'open ledger': {
            const y= parse_open_ledger(ts);
            build_accounts(y as OpenLedger, lg);
            break;
        }
        case 'use account': {
            const y = ts.next();
            if (y.type !== "ACCOUNT") throw parse_error(y);
            current.account = y.lexeme;
            break;
        }
        case 'include': {
            const y = ts.next();
            if (y.type !== "STRING") throw parse_error(y);
            do_parse(resolve_path(file, y.lexeme), lg);
            break;
        }
        case 'journal': {
            const lgx = {
                start_date: lg.start_date,
                end_date: lg.end_date,
                accounts: lg.accounts,
                unposted: [],
            };

            const y = ts.next();
            if (y.type !== "STRING") throw parse_error(y);
            do_parse(resolve_path(file, y.lexeme), lgx);
            lg.unposted = lg.unposted.concat(lgx.unposted);
            break;
        }
        default: throw parse_error(x);
    }
}

interface CurrentState {
    date: string,
    account: string,
}

function ledger_unposted_last(lg: Ledger) {
    return lg.unposted[lg.unposted.length-1];
}

function parse_entries(ts: TokenStream<Token>): Entry[] {
    const xs: Entry[] = [];
    while (!ts.eof()) {
        const aa = ts.next();
        if (aa.type !== "NUMBER") parse_error(aa);

        const bb = ts.next();
        if (bb.type !== "ACCOUNT") parse_error(bb);

        const a = cur_s2n(aa.lexeme);
        const b = bb.lexeme;
        xs.push(entry(b, a, resolve_amount_type(b)));

        if (ts.eof() || ts.peek().type !== "NUMBER") {
            break;
        }
    }
    return xs;
}

function parse_journal_entry(ts: TokenStream<Token>, lg: Ledger, current: CurrentState) {
    const xs = parse_entries(ts);

    const add_je = (x: JournalEntry) => {
        const last = ledger_unposted_last(lg);
        if (last && last.date > current.date) throw new Error(`Postings not in sequence: ${last.date} > ${current.date}}`);
        lg.unposted.push(x);
    };

    if (current.account) {
        xs.forEach(e => add_je({date: current.date, xs: [e, entry(current.account, e.amount.value, reverse_type(e.amount.type))]}));
    }
    else {
        add_je({date: current.date, xs: xs});
    }
    current.date = '';
}

function do_parse(file: string, lg: Ledger) {
    log_info(`Parsing: ${file}`);
    const source = fs_read_utf8(file);
    const ts= lex(file, source);
    try {
        _do_parse(ts, file, lg);
    }
    catch (e) {
        if (e.t) {
            const f = new Error(build_error_string(source, e.t, file, "@"));
            f.cause = e.cause;
            throw f;
        }
        else {
            throw e;
        }
    }
}

function _do_parse(ts: TokenStream<Token>, file: string, lg: Ledger) {
    const current = {
        date: '',
        account: '',
    };

    while (!ts.eof()) {
        const x = ts.peek();
        if (x.type === "DATE") {
            if (!lg.start_date) lg.start_date = x.lexeme;
            current.date = x.lexeme;
            ts.next();
        }
        else if (x.type === "NUMBER") {
            if (current.date) {
                parse_journal_entry(ts, lg, current);
            }
            else {
                throw parse_error(x);
            }
        }
        else if (x.type === "DIRECTIVE") {
            parse_directive(ts, lg, file, current);
        }
        else {
            throw parse_error(x);
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

    do_parse(file , lg);

    lg.unposted = lg.unposted.sort((a, b) => string_sort(a.date, b.date));
    const last = lg.unposted[lg.unposted.length-1];
    lg.end_date = last ? last.date : lg.end_date;
    return lg;
}