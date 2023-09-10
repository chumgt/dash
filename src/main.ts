import * as fs from "node:fs";
import * as yargs from "yargs";
import { DashError } from "./error";
import { Expression } from "./expression";
import { ModuleNode } from "./node";
import { NativeFunctionValue, Value } from "./value";
import { Vm } from "./vm";
import * as parsing from "./parse";
import * as types from "./type";

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

export function dostring(str: string, vm = Vm.alloc(0)): Value {
  const chunk = buildstring(str);
  // chunk.apply(vm);
  console.log(chunk.kind, (chunk as any).type)
  if (chunk instanceof Expression)
    return chunk.evaluate(vm);
  chunk.apply(vm);
  console.log("it was a module")
  throw null;
}

export function buildstring(str: string): ModuleNode | Expression {
  const asts = (parsing.parse(str));
  const chunk = asts[0];

  if (asts.length > 1) {
    console.warn(`Ambiguous (${asts.length} results)`);
  }

  return chunk as any;
}

export function newVm(): Vm {
  const vm = Vm.alloc(0);

  vm.assign("import", new NativeFunctionValue(undefined, (args: Value[]) => {
    const filepath = args[0].data;
    const content = fs.readFileSync(filepath, "utf-8");
    const chunk = buildstring(content);
    if (! (chunk instanceof ModuleNode))
      throw new DashError("import of non-module")

    const sub = newVm();
    chunk.apply(sub);
    return sub.getExportsAsValue();
  }));
  vm.assign("mod", new NativeFunctionValue(undefined, (args: Value[]) => {
    const a = args[0], b = args[1];
    if (! (types.NUMBER.isAssignable(a.type) && types.NUMBER.isAssignable(b.type)))
      throw new DashError("expected two numbers");

    return new Value(types.Type.biggest(a.type, b.type), a.data % b.data);
  }));
  vm.assign("typeof", new NativeFunctionValue(undefined, (args: Value[]) => {
    if (args.length !== 1)
      throw new DashError("expected 1 arg, received " + args.length);
    return new Value(types.TYPE, args[0].type);
  }));
  vm.assign("print", new NativeFunctionValue(undefined, (args: Value[]) => {
    let c = new Value(types.STRING, "");
    for (let arg of args) {
      console.log(arg.data);
      c = new Value(types.STRING, c.data + "\n" + arg.data);
    }
    return c;
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
  return vm;
}

function main() {
  if (! (args.eval || args.file)) {
    console.warn("No source file or evaluation string")
    pargs.showHelp();
    return;
  }

  const vm = newVm();

  const code = args.eval ?? fs.readFileSync(args.file!, "utf-8");
  let checkpoint = Date.now();
  const chunk = buildstring(code);
  console.log(`Parsed in ${Date.now()-checkpoint}ms`);
  fs.writeFileSync("./ast.json", JSON.stringify(chunk, null, 2));

  checkpoint = Date.now();
  const res = (chunk instanceof Expression)
    ? chunk.evaluate(vm)
    : chunk.apply(vm);
  console.log(`Done in ${Date.now()-checkpoint}ms!`);
  if (res) {
    console.log(res.toString());
  } else {
    for (let key of vm.exports.keys()) {
      const exprt = vm.get(key);
      console.log(`export ${key} = ${exprt.toString()}`);
    }
  }
};

if (module === require.main)
  main();
