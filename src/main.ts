import * as fs from "node:fs";
import * as yargs from "yargs";
import chalk from "chalk";
import { ChunkNode } from "./node";
import { Type } from "./type";
import { Value } from "./value";
import { Vm } from "./vm";
import * as data from "./data";
import * as parsing from "./parse";

const pargs = yargs
    .string("printast")
      .choices("printast", ["all", "one"])
      .default("printast", "one")
    .string("eval")
      .alias("eval", "e")
      .describe("eval", "The source (input) code")
    .string("file")
      .alias("file", "f")
    .scriptName(process.argv[1])

const args = pargs.parse(process.argv);

export function dostring(str: string, vm = new Vm()): Value {
  const chunk = buildstring(str);
  return chunk.evaluate(vm);
}

export function buildstring(str: string): ChunkNode {
  const asts = parsing.filterDuplicateChunks(parsing.parse(str));
  const chunk = asts[0];

  if (asts.length > 1)
    console.warn(`Ambiguous (${asts.length} results)`);

  return chunk;
}

function main() {
  if (! (args.eval || args.file)) {
    console.warn("No source file or evaluation string")
    pargs.showHelp();
    return;
  }

  try { // Now try running the script.
    const vm = new Vm();
    vm.assign("int", new Value(data.Type.Type, new Type()));

    const filecontent = fs.readFileSync(args.file!, "utf-8");
    let checkpoint = Date.now();
    const chunk = buildstring(filecontent);
    console.log(`Parsed in ${Date.now()-checkpoint}ms`);
    checkpoint = Date.now();
    const res = chunk.evaluate(vm);
    console.log(`Done in ${Date.now()-checkpoint}ms`);
    console.log(`= (${res.type}) ${chalk.yellow(res.data)}`);

    fs.writeFileSync("./ast.json", JSON.stringify(chunk, null, 2));
  } catch (ex) {
    throw ex;
  }
};

if (module === require.main)
  main();
