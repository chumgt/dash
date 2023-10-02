import ne from "nearley";
import { Writable } from "node:stream";
import { DashError } from "./error.js";
import { ChunkNode } from "./node.js";
import { TokenSource } from "./token.js";

import * as grammarRules from "./grammar/index.js";
const grammar = ne.Grammar.fromCompiled(grammarRules);

export class DashParseError extends DashError {
  public constructor(message?: string, opts?: ErrorOptions,
      public readonly source?: TokenSource) {
    super(message, opts);
  }
}

export interface Parser {
  feed(chunk: string): this;
  /** Close the parser and return its results. */
  finish(): ChunkNode[];
}

export interface ParseOptions {
  all: boolean;
}

export function parse(chunk: string): ChunkNode {
  return parseAll(chunk)[0];
}

export function parseAll(chunk: string): ChunkNode[] {
  const parser = newParser();
  try {
    parser.feed(chunk);
  } catch (ex: any) {
    throw new DashParseError(ex.message, {cause: ex}, ex.token);
  }

  const asts = parser.finish();
  return asts;
}

export function createParseStream(parser: Parser): Writable {
  return new Writable({
    write(chunk, _encoding, done) {
      try {
        parser.feed(chunk.toString("utf-8"));
        done();
      } catch (ex) {
        done(ex);
      }
    }
  });
}

export function newParser(): Parser {
  return new ne.Parser(grammar);
}
