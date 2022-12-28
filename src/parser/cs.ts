/**
 * Copyright (C) 2022 Sieve
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
export interface CharStream {
    x: string,
    index: number,
    line_indexes: number[],
    eof: boolean,
}

export function cs_new(x: string) {
    x =	x.replaceAll(/\t/g, ' ');
    x =	x.replaceAll(/[ ]*\n[ ]+\n[ ]*/g, '\n\n');

    const cs: CharStream = {
        x: x,
        index: 0,
        line_indexes: [],
        eof: false,
    };
    cs.line_indexes.push(cs.index);
    return cs;
}

export function cs_peek(cs: CharStream) {
    return cs.x[cs.index];
}

export function cs_next(cs: CharStream) {
    const x = cs_peek(cs);
    cs.index += 1;
    cs.eof = cs.index >= cs.x.length;
    if (x === '\n') cs.line_indexes.push(cs.index-1);
    return x;
}

export function cs_loc(cs: CharStream, index: number) {
    let idx = cs.line_indexes.length-1;
    for (let i = 0; i < cs.line_indexes.length; i++) {
        const x = cs.line_indexes[i];
        if (x > index) {
            idx = i-1;
            break;
        }
    }
    const n = cs.line_indexes[idx];
    return {
        row: idx,
        col: index - n,
    };
}