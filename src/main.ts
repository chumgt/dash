#!/usr/bin/env node
import fs from "node:fs";
import yargs from "yargs";
import { newVm } from "./vm/vm.js";
import { Expression } from "./expression.js";
import { NodeKind } from "./node.js";
import { StatementBlock } from "./statement.js";
import { Platform } from "./vm/platform.js";
import { DatumType, nameToTypeMap } from "./data.js";
import * as parsing from "./parse.js";
import * as types from "./vm/types.js";

const dImportFunction = new Function("modulePath", "return import(modulePath)");
export async function dimport<T extends string>(module: T): Promise<any> {
  return await dImportFunction(module);
}

// export function dostring(str: string, vm = new DashJSVM): Value {
//   const chunk = parsing.parse(str);
//   return dochunk(chunk, vm);
// }

// export function dochunk(chunk: ChunkNode, vm = new Vm): Value {
//   switch (chunk.kind) {
//     case NodeKind.Expression:
//       return (chunk as Expression).evaluate(vm);
//     case NodeKind.Block:
//       (chunk as StatementBlock).apply(vm);
//       return vm.getExportsAsValue();
//     default:
//       throw new DashError("string is not an expression");
//   }
// }

async function main() {
  const pargs = yargs
      .string("printast")
        .choices("printast", ["all", "one"])
        .default("printast", "one")
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
  const env = new Platform();
  env.defineBaseType(DatumType.Float, types.FLOAT)
  env.defineBaseType(DatumType.Float32, types.FLOAT32)
  env.defineBaseType(DatumType.Float64, types.FLOAT64)
  env.defineBaseType(DatumType.Integer, types.INT)
  env.defineBaseType(DatumType.Int8, types.INT8)
  env.defineBaseType(DatumType.Int16, types.INT16)
  env.defineBaseType(DatumType.Int32, types.INT32)
  env.defineBaseType(DatumType.Int64, types.INT64)
  env.defineBaseType(DatumType.Function, types.FUNCTION)
  env.defineBaseType(DatumType.Number, types.NUMBER)
  env.defineBaseType(DatumType.String, types.STRING)
  env.defineBaseType(DatumType.Type, types.TYPE);
  env.defineBaseType(DatumType.Array, types.ARRAY);
  env.defineBaseType(DatumType.Object, types.OBJECT);
  env.defineBaseType(DatumType.Any, types.ANY)

  const vm = newVm(env);
  for (let key of Object.keys(nameToTypeMap)) {
    vm.declare(key, {type: types.TYPE});
    vm.assign(key, env.getBaseTypeAsValue(nameToTypeMap[key]));
  }

  const code = args.eval ?? fs.readFileSync(args.file!, "utf-8");
  let checkpoint = Date.now();
  const chunks = parsing.parseAll(code);
  const chunk = chunks[0];
  if (chunks.length > 1)
    console.log("chunks: " + chunks.length);
  fs.writeFileSync("./ast.json", JSON.stringify(chunk, null, 2));

  checkpoint = Date.now();
  const res = (chunk.kind === NodeKind.Expression)
      ? (chunk as Expression).evaluate(vm)
      : (chunk as StatementBlock).apply(vm);
  const ms = Date.now() - checkpoint;
  if (res) {
    console.log(chalk.default.yellow(res.type.stringify(res)));
  } else {
    vm.getExportsAsValue();
    for (let [key, value] of Object.entries(vm.getExports())) {
      console.log(`export ${key} = ${value.toString()}`);
    }
  }
  console.log(`\n\nDone in ${ms}ms!`);
}

if (module === require.main)
  main();
