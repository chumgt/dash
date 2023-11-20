#!/usr/bin/env node
import fs from "node:fs";
import yargs from "yargs";
import { newVm } from "./vm/vm.js";
import { Expression } from "./expression.js";
import { NodeKind } from "./node.js";
import { StatementBlock } from "./statement.js";
import * as platforms from "./vm/platform.js";
import * as parsing from "./parse.js";

const dImportFunction = new Function("modulePath", "return import(modulePath)");
export async function dimport<T extends string>(module: T): Promise<any> {
  return await dImportFunction(module);
}

async function main() {
  const pargs = yargs
      .boolean("printast")
        .default("printast", false)
        .describe("printast", "Write the AST to a JSON file")
      .string("eval")
        .alias("eval", "e")
        .describe("eval", "The source (input) code")
      .string("file")
        .alias("file", "f")
        .normalize("file")
      .conflicts("file", "eval")
      .scriptName(process.argv[1])

  const args = pargs.parse(process.argv);

  if (! (args.eval || args.file)) {
    console.warn("No source file or evaluation string")
    pargs.showHelp();
    return;
  }

  const chalk = await dimport("chalk");

  const vm = newVm(platforms.newJsPlatform());

  const code = args.eval ?? fs.readFileSync(args.file!, "utf-8");
  let checkpoint = Date.now();
  const chunks = parsing.parseAll(code);
  console.log(`Parsed in ${Date.now() - checkpoint}ms!`);
  checkpoint = Date.now();

  if (chunks.length > 1)
    console.log("chunks: " + chunks.length);

  const chunk = chunks[0];
  if (args.printast)
    fs.writeFileSync("./ast.json", JSON.stringify(chunk, null, 2));

  checkpoint = Date.now();
  const res = (chunk.kind === NodeKind.Expression)
      ? (chunk as Expression).evaluate(vm)
      : (chunk as StatementBlock).apply(vm);
  const ms = Date.now() - checkpoint;
  if (res) {
    console.log(chalk.default.yellow(res.type.stringify(res, {vm})));
  }

  for (let [key, value] of Object.entries(vm.getExports())) {
    console.log(`export ${key} = ${value.toString()}`);
  }

  console.log(`\n\nDone in ${ms}ms!`);
}

if (module === require.main)
  main();
