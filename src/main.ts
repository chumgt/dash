#!/usr/bin/env node
import fs from "node:fs";
import rlsync from "readline-sync";
import yargs from "yargs";
import { DatumType } from "./data.js";
import { DashError } from "./error.js";
import { Expression } from "./expression.js";
import { Block, ChunkNode, NodeKind } from "./node.js";
import { Value, newArray, wrap, wrapFunction } from "./vm/value.js";
import { Vm } from "./vm/vm.js";
import * as parsing from "./parse.js";
import * as types from "./vm/type.js";

export function dostring(str: string, vm = new Vm): Value {
  const chunk = parsing.parse(str);
  return dochunk(chunk, vm);
}

export function dochunk(chunk: ChunkNode, vm = new Vm): Value {
  switch (chunk.kind) {
    case NodeKind.Expression:
      return (chunk as Expression).evaluate(vm);
    case NodeKind.Block:
      (chunk as Block).apply(vm);
      return vm.getExportsAsValue();
    default:
      throw new DashError("string is not an expression");
  }
}

export function newVm(): Vm {
  const vm = new Vm();

  const USE_JSFN = false;
  const jsfn = wrapFunction((args) => {
    const d_keys = args[0].data as Value[];
    const js_value = global[d_keys[0].data][d_keys[1].data];

    return wrapFunction((args) => {
      return (USE_JSFN) ? wrap(js_value) : args[0];
    });
  });

  vm.assign("Array", new Value(types.TYPE, types.ARRAY));
  vm.assign("array", wrapFunction((args) => {
    return newArray(vm, args);
  }));
  vm.assign("import", wrapFunction((args) => {
    return vm.importModule(args[0].data);
  }));
  vm.assign("input", wrapFunction((args) => {
    const question = args[0]?.data ?? "";
    const answer = rlsync.question(question);
    if (args[1]) {
      const type = args[1].data as types.ValueType;
      return type.from(DatumType.String, answer);
    } else {
      return new Value(types.STRING, answer);
    }
  }));
  vm.assign("stop", Value.ITER_STOP);
  vm.assign("typeof", wrapFunction((args) => {
    if (args.length !== 1)
      throw new DashError("expected 1 arg, received " + args.length);
    return new Value(types.TYPE, args[0].type);
  }));
  vm.assign("write", wrapFunction((args) => {
    if (args.length === 0)
      throw new DashError("must provide an argument to output");

    let str = "";
    for (let arg of args)
      str += arg.data;
    process.stdout.write(str);
    return new Value(types.STRING, str);
  }));
  vm.assign("float", new Value(types.TYPE, types.FLOAT));
  vm.assign("float32", new Value(types.TYPE, types.FLOAT32));
  vm.assign("float64", new Value(types.TYPE, types.FLOAT64));
  vm.assign("int", new Value(types.TYPE, types.INT));
  vm.assign("int8", new Value(types.TYPE, types.INT8));
  vm.assign("int16", new Value(types.TYPE, types.INT16));
  vm.assign("int32", new Value(types.TYPE, types.INT32));
  vm.assign("int64", new Value(types.TYPE, types.INT64));
  vm.assign("fn", new Value(types.TYPE, types.FUNCTION));
  vm.assign("str", new Value(types.TYPE, types.STRING));

  vm.assign("jsfn", jsfn);

  vm.assign("native", new Value(types.OBJECT, {}, {
    mod: wrapFunction((args) => {
      if (args.length !== 2)
        throw new DashError(`expected 2 args, received ${args.length}`);
      if (! args[0].type.extends(types.NUMBER))
        throw new DashError(`cannot get modulo of a ${args[0].type.name}`);
      if (! args[1].type.extends(types.NUMBER))
        throw new DashError(`arg 2 expected number, got ${args[0].type.name}`);
      const a = args[0].data;
      const b = args[1].data;
      return new Value(args[0].type, a % b);
    })
  }));
  vm.assign("new", wrapFunction((args) => {
    const t = args[0].data;
    const v = new Value(types.OBJECT, 0, {
      ["foo"]: new Value(types.STRING, "bar!"),
      ["t"]: t
    });
    return v;
  }));

  vm.defineNs("dash", "./stdlib/");
  return vm;
}

function main() {
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

  const vm = newVm();

  const code = args.eval ?? fs.readFileSync(args.file!, "utf-8");
  let checkpoint = Date.now();
  const chunks = parsing.parseAll(code);
  // console.log(`Parsed in ${Date.now()-checkpoint}ms`);
  const chunk = chunks[0];
  if (chunks.length > 1) console.log("chunks: " + chunks.length);
  let a=[];
  for (const c of chunks)
    a[JSON.stringify(c)] = 1;
  console.log("down to " + Object.keys(a).length)
  fs.writeFileSync("./ast.json", JSON.stringify(chunk, null, 2));

  checkpoint = Date.now();
  const res = (chunk.kind === NodeKind.Expression)
      ? (chunk as Expression).evaluate(vm)
      : (chunk as Block).apply(vm);
  console.log(`\n\nDone in ${Date.now()-checkpoint}ms!`);
  if (res) {
    console.log(res.toString());
  } else {
    vm.getExportsAsValue();
    for (let [key, value] of Object.entries(vm.getExports())) {
      console.log(`export ${key} = ${value.toString()}`);
    }
  }
}

if (module === require.main)
  main();
