import * as ne from "nearley";
import { DashError } from "./error";
import { ChunkNode } from "./node";
import { TokenSource } from "./token";

import * as grammarRules from "./grammar/index";
const grammar = ne.Grammar.fromCompiled(grammarRules);

export class DashParseError extends DashError {
  public constructor(message?: string, opts?: ErrorOptions,
      public readonly source?: TokenSource) {
    super(message, opts);
    this.name = "DashParseError";
  }
}

export function parse(str: string): ChunkNode[] {
  const parser = new ne.Parser(grammar);
  try {
    parser.feed(str);
  } catch (ex: any) {
    throw new DashParseError(ex.message, {cause: ex}, ex.token);
  }

  const asts: ChunkNode[] = parser.finish();
  return asts;
}

// TODO this is really silly. but i'm sure there are false ambiguities showing
// up. this reduces a lot of them.
export function filterDuplicateChunks(chunks: ChunkNode[]): ChunkNode[] {
  const set = new Set<string>();
  const uniqueChunks: ChunkNode[] = [];
  for (let chunk of chunks) {
    const str = JSON.stringify(chunk);
    if (! set.has(str)) {
      uniqueChunks.push(chunk);
      set.add(str);
    }
  }
  return uniqueChunks;
}
