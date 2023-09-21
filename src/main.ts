#!/usr/bin/env node
import fs from "node:fs";
import rlsync from "readline-sync";
import yargs from "yargs";
import { DatumType } from "./data";
import { DashError } from "./error";
import { Expression } from "./expression";
import { Block, ChunkNode, NodeKind } from "./node";
import { Value, wrapFunction } from "./value";
import { Vm } from "./vm";
import * as parsing from "./parse";
import * as types from "./type";

export function dostring(str: string, vm = new Vm): Value {
  const chunk = parsing.parse(str);
  return dochunk(chunk, vm);
}

export function dochunk(chunk: ChunkNode, vm = new Vm): Value {
  if (chunk.kind === NodeKind.Expression) {
    const expr = chunk as Expression;
    return expr.evaluate(vm);
  } else if (chunk.kind === NodeKind.Block) {
    const mod = chunk as Block;
    mod.apply(vm);
    return vm.getExportsAsValue();
  } else {
    throw new DashError("string is not an expression");
  }
}

export function newVm(): Vm {
  const vm = new Vm();

  function newArray(values: Value[]): Value {
    const self:Value = new Value(types.OBJECT, values ?? [], {
      length: new Value(types.INT32, values.length),
      add: wrapFunction((args) => {
        // self.data.push(...args);
        // (self as any).props.length.data += args.length;
        // return self;
        return newArray([...self.data, ...args]);
      }),
      at: wrapFunction((args) => {
        if (! types.INT.isAssignable(args[0].type))
          throw new DashError("array index must be an int");

        const index = args[0].data;
        if (index < 0 || index >= self.data.length)
          throw new DashError(`array index ${index} out of bounds (${self.data.length})`);
        return self.data[index];
      }),
      has: wrapFunction((args) => {
        const index = self.data.findIndex(x => x.data === args[0].data);
        return new Value(types.INT8, index >= 0 ? 1 : 0);
      }),
      // iter: wrapFunction((args) => {
      //   let i = 0;
      //   return wrapFunction(() => {
      //     if (i > )
      //   });
      // })
    });
    return self;
  }

  vm.assign("array", wrapFunction((args) => {
    return newArray(args);
  }));
  vm.assign("has", wrapFunction((args) => {
    return new Value(types.INT8, args[0].data.indexOf(args[1].data) >= 0 ? 1 : 0);
  }));
  vm.assign("append", wrapFunction((args) => {
    args[0].data.push(args[1].data);
    return args[0];
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
  vm.assign("mod", wrapFunction((args) => {
    const a = args[0],
          b = args[1];
    if (! (types.NUMBER.isAssignable(a.type) && types.NUMBER.isAssignable(b.type)))
      throw new DashError("expected two numbers");

    return new Value(types.ValueType.biggest(a.type, b.type), a.data % b.data);
  }));
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

  vm.assign("native", new Value(types.OBJECT, {}, {
    random: wrapFunction((args) => new Value(types.FLOAT32, Math.random()))
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
  if (chunks.length > 1) console.log("chunks: " + chunks.length)
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
