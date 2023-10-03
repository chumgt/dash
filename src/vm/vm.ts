import fs from "node:fs";
import paths from "node:path";
import rlsync from "readline-sync";
import { DatumType } from "../data.js";
import { DashError } from "../error.js";
import { Expression } from "../expression.js";
import { NodeKind } from "../node.js";
import { Type, ValueType } from "../type.js";
import { OBJECT } from "./types.js";
import { FunctionValue, Value, newArray, wrap, wrapFunction } from "./value.js";
import { FunctionOverloads } from "./function.js";
import * as parsing from "../parse.js";
import * as types from "./types.js";
import { StatementBlock } from "../statement.js";
import { Environ } from "./environ.js";

export interface ValueHeader {
  type: Type;
  flags?: number;
}

export class VmError extends DashError { }

export interface Vm {
  readonly env: Environ;
  declare(identifier: string, header: ValueHeader): Vm;
  assign(identifier: string, value: Value): Vm;
  defineFn(id: string, func: FunctionValue);
  defineNs(ns: string, dir: string): void;
  addExport(identifier: string, value?: Value): void;
  importModule(filepath: string): Value;
  resolveImportPath(filepath: string): string;
  newDatumValue(type: DatumType, data: any): Value;
  getExports(): Record<string, Value>;
  getExportsAsValue(): Value;
  get(identifier: string): Value | never;
  has(identifier: string): boolean;
  ref(identifier: string): ({id:string, vm: Vm}) | void;
  save(): Vm;
  sub(): Vm;
  throwValue(val?: Value): never;
}

export class DashJSVM implements Vm {
  public readonly env: Environ;
  protected readonly parent: Vm;
  protected namespaces: Record<string, string>;
  protected declarations: Record<string, ValueHeader>;
  protected defHeaders: Record<string, ValueHeader>;
  protected functions: Record<string, FunctionOverloads>;
  protected variables: Record<string, Value>;
  protected imports: Map<string, Value>;
  protected exports: Map<string, FunctionOverloads | Value>;
  protected stack: Value[];

  public constructor(env: Environ) {
    this.env = env;
    this.namespaces = { };
    this.defHeaders = { };
    this.declarations = { };
    this.functions = { };
    this.variables = { };
    this.imports = new Map();
    this.exports = new Map();
    this.stack = [ ];
  }

  public declare(identifier: string, header: ValueHeader) {
    if (identifier in this.defHeaders)
      throw new DashError("already declared " + identifier);
    this.declarations[identifier] = header;
    return this;
  }

  public assign(identifier: string, value: Value) {
    if (identifier in this.declarations) {
      const header = this.declarations[identifier];
      if (! header.type.isAssignable(value.type))
        throw new DashError(`cannot assign ${value.type.name} to ${header.type.name}`);
      this.variables[identifier] = value;
      return this;
    }
    else if (this.parent) {
      return this.parent.assign(identifier, value);
    }
    else {
      throw new DashError(`${identifier} not defined`);
    }
  }

  public defineFn(id: string, func: FunctionValue) {
    this.functions[id] ??= new FunctionOverloads();
    if (func.params) {
      this.functions[id].set(func.params, func);
    }
  }

  public defineNs(ns: string, dir: string): void {
    if (ns in this.namespaces)
      throw new VmError(`namespace '${ns}' already defined`);

    if (! /[a-zA-Z_][a-zA-Z0-9_]*/.test(dir))
      throw new VmError(`invalid namespace name '${ns}'`);

    if (! dir.endsWith("/"))
      dir += "/";

    this.namespaces[ns] = dir;
  }

  public addExport(identifier: string, value?: Value): void {
    if (value) {
      this.exports.set(identifier, value);
      return;
    }

    if (! this.has(identifier))
      throw new DashError("unknown identifier " + identifier);

    return this.addExport(identifier, this.get(identifier));
  }

  public importModule(filepath: string): Value {
    filepath = paths.normalize(filepath);
    if (filepath in this.imports)
      return this.imports[filepath];

    if (! fs.existsSync(filepath)) {
      const resolved = this.resolveImportPath(filepath);
      if (! fs.existsSync(resolved))
        throw new DashError(`module '${filepath}' not found`);
      filepath = resolved;
    }

    const content = fs.readFileSync(filepath, "utf-8");
    const chunk = parsing.parse(content);

    if (chunk.kind === NodeKind.Block) {
      const module = chunk as StatementBlock;
      const sub = this.sub();
      module.apply(sub);
      const value = sub.getExportsAsValue();
      this.imports[filepath] = value;
      return value;
    } else if (chunk.kind === NodeKind.Expression) {
      const expr = chunk as Expression;
      const value = expr.evaluate(this);
      this.imports[filepath] = value;
      return value;
    } else {
      throw new DashError("importing unknown type " + chunk.kind);
    }
  }

  public resolveImportPath(filepath: string): string {
    if (! filepath.endsWith(".dash"))
      filepath += ".dash";

    for (let ns of Object.keys(this.namespaces)) {
      if (filepath.startsWith(`${ns}:`)) {
        filepath = this.namespaces[ns] + filepath.substring(ns.length+1);
        break;
      }
    }

    return filepath;
  }

  public newDatumValue(type: DatumType, data: any): Value {
    const vtype = this.env.getBaseType(type);
    return new Value(vtype, data);
  }

  public getExports(): Record<string, Value> {
    const exports = { } as Record<string, Value>;
    for (let [key, value] of this.exports)
      exports[key] = value instanceof FunctionOverloads ? value.toValue() : value;
    return exports;
  }

  public getExportsAsValue(): Value {
    return new Value(OBJECT, 0, this.getExports());
  }

  public get(identifier: string): Value | never {
    if (identifier in this.variables)
      return this.variables[identifier];
    if (identifier in this.functions)
      return this.functions[identifier].toValue();
    if (this.parent)
      return this.parent.get(identifier);
    throw new DashError(`Undefined '${identifier}'`);
  }

  public has(identifier: string): boolean {
    return (identifier in this.declarations)
        || (identifier in this.functions)
        || this.parent?.has(identifier)
        || false;
  }

  public ref(identifier: string): ({id:string, vm: Vm}) | void {
    if (identifier in this.declarations)
      return {id:identifier, vm:this};
    if (this.parent)
      return this.parent.ref(identifier);
    throw new DashError(`Undefined '${identifier}'`);
  }

  public save(): Vm {
    const sub = new DashJSVM(this.env);
    Object.assign(sub.declarations, this.declarations);
    Object.assign(sub.functions, this.functions);
    Object.assign(sub.variables, this.variables);
    sub.stack.push(...this.stack);
    return sub;
  }

  public sub(): Vm {
    const sub = new DashJSVM(this.env);
    (sub as any).parent = this;
    return sub;
  }

  public throwValue(val?: Value): never {
    throw new DashError(`Throw! ${val}`);
  }
}

export function resolveImportPath(path: string): string {
  if (! path.endsWith(".dash"))
    return resolveImportPath(`${path}.dash`);

  return paths.normalize(path);
}

export function newVm(env: Environ): Vm {
  const vm = new DashJSVM(env);

  const USE_JSFN = true;
  const jslink = wrapFunction((args) => {
    if (args.length < 1)
      throw new DashError("expected at least 1 arg")
    if (! types.ARRAY.isAssignable(args[0].type))
      throw new DashError(`arg 1 expected array, got ${args[0].type.name}`);
    if (! args[0].data.every(x => types.STRING.isAssignable(x.type)))
      throw new DashError(`arg 1 expected array[str]`);

    if (args[1] && ! types.TYPE.isAssignable(args[1].type))
      throw new DashError(`arg 2 expected type, got ${args[1].type.name}`);

    const d_keys = args[0].data as Value[];
    const js_value = globalThis[d_keys[0].data][d_keys[1].data];
    const type: ValueType = args[1]?.data ?? types.ANY;

    return wrapFunction((args) => {
      if (! USE_JSFN)
        return args[0];

      if (type) {
        return type.wrap(js_value);
      }
      return wrap(js_value, type);
    });
  });

  const FUNCTION = env.getBaseType(DatumType.Function);
  const OBJECT = types.OBJECT;
  const TYPE = env.getBaseType(DatumType.Type);
  vm.declare("Array", {type: TYPE});
  vm.assign("Array", new Value(TYPE, types.ARRAY));

  vm.declare("array", {type: FUNCTION});
  vm.assign("array", wrapFunction((args) => {
    return newArray(vm, args);
  }));
  vm.declare("import", {type: FUNCTION});
  vm.assign("import", wrapFunction((args) => {
    return vm.importModule(args[0].data);
  }));
  vm.declare("input", {type: FUNCTION});
  vm.assign("input", wrapFunction((args) => {
    const question = args[0]?.data ?? "";
    const answer = rlsync.question(question);
    if (args[1]) {
      const type = args[1].data as ValueType;
      return type.from(DatumType.String, answer);
    } else {
      return new Value(types.STRING, answer);
    }
  }));
  vm.declare("typeof", {type: FUNCTION});
  vm.assign("typeof", wrapFunction((args) => {
    if (args.length !== 1)
      throw new DashError("expected 1 arg, received " + args.length);
    return new Value(types.TYPE, args[0].type);
  }));
  vm.declare("write", {type: FUNCTION});
  vm.assign("write", wrapFunction((args) => {
    if (args.length === 0)
      throw new DashError("must provide an argument to output");

    let str = "";
    for (let arg of args)
      str += arg.data;
    process.stdout.write(str);
    return new Value(types.STRING, str);
  }));

  vm.declare("jslink", {type: FUNCTION});
  vm.assign("jslink", jslink);

  vm.declare("native", {type: OBJECT});
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
  vm.declare("new", {type: FUNCTION});
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
