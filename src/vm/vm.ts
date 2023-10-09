import fs from "node:fs";
import paths from "node:path";
import rlsync from "readline-sync";
import { DatumType, nameToTypeMap, typeToNameMap } from "../data.js";
import { DashError } from "../error.js";
import { Expression } from "../expression.js";
import { NodeKind } from "../node.js";
import { Type, ValueType } from "../type.js";
import { FunctionValue, Value, newArray, wrap, wrapFunction } from "./value.js";
import { FunctionOverloads } from "./function.js";
import * as parsing from "../parse.js";
import { StatementBlock } from "../statement.js";
import { Platform } from "./platform.js";

export interface ValueHeader {
  type: Type;
  flags?: number;
}

export class VmError extends DashError { }

export interface Vm {
  readonly platform: Platform;
  declare(identifier: string, header: ValueHeader): Vm;
  isDeclared(identifier: string): boolean;
  assign(identifier: string, value: Value): Vm;
  defineFn(id: string, func: FunctionValue): Vm;
  defineNs(ns: string, dir: string): Vm;
  addExport(identifier: string, value?: Value): Vm;
  importModule(filepath: string): Value;
  getExports(): Record<string, Value>;
  getExportsAsValue(): Value;
  get(identifier: string): Value | never;
  has(identifier: string): boolean;
  sub(): Vm;
  throwValue(val?: Value): never;
}

export class DashJSVM implements Vm {
  public readonly platform: Platform;
  protected readonly parent: Vm;
  protected namespaces: Record<string, string>;
  protected declarations: Record<string, ValueHeader>;
  protected functions: Record<string, FunctionOverloads>;
  protected variables: Record<string, Value>;
  protected imports: Map<string, Value>;
  protected exports: Map<string, FunctionOverloads | Value>;
  protected stack: Value[];

  public constructor(env: Platform) {
    this.platform = env;
    this.namespaces = { };
    this.declarations = { };
    this.functions = { };
    this.variables = { };
    this.imports = new Map();
    this.exports = new Map();
    this.stack = [ ];

    const t_Type = this.platform.getBaseType(DatumType.Type);
    for (let key of Object.keys(nameToTypeMap)) {
      this.declare(key, {type: t_Type});
      this.assign(key, env.getBaseTypeAsValue(nameToTypeMap[key]));
    }
  }

  public declare(identifier: string, header: ValueHeader) {
    if (identifier in this.declarations)
      throw new DashError("already declared " + identifier);
    this.declarations[identifier] = header;
    return this;
  }

  public isDeclared(identifier: string): boolean {
    if (identifier in this.declarations)
      return true;
    if (this.parent)
      return this.parent.isDeclared(identifier);
    return false;
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
      this.functions[id].add(func);
    }
    return this;
  }

  public defineNs(ns: string, dir: string) {
    if (ns in this.namespaces)
      throw new VmError(`namespace '${ns}' already defined`);

    if (! /[a-zA-Z_][a-zA-Z0-9_]*/.test(dir))
      throw new VmError(`invalid namespace name '${ns}'`);

    if (! dir.endsWith("/"))
      dir += "/";

    this.namespaces[ns] = dir;
    return this;
  }

  public addExport(identifier: string, value?: Value) {
    if (value) {
      this.exports.set(identifier, value);
      return this;
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

  public getExports(): Record<string, Value> {
    const exports = { } as Record<string, Value>;
    for (let [key, value] of this.exports)
      exports[key] = value instanceof FunctionOverloads ? value.toValue() : value;
    return exports;
  }

  public getExportsAsValue(): Value {
    const OBJECT = this.platform.getBaseType(DatumType.Object);
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

  public save(): Vm {
    const sub = new DashJSVM(this.platform);
    Object.assign(sub.declarations, this.declarations);
    Object.assign(sub.functions, this.functions);
    Object.assign(sub.variables, this.variables);
    sub.stack.push(...this.stack);
    return sub;
  }

  public sub(): Vm {
    const sub = new DashJSVM(this.platform);
    (sub as any).parent = this;
    return sub;
  }

  public throwValue(val?: Value): never {
    throw new DashError(`Throw! ${val ?? ""}`);
  }
}

export function newVm(env: Platform): Vm {
  const vm = new DashJSVM(env);

  const {
    [DatumType.Any]: t_Any,
    [DatumType.Array]: t_Array,
    [DatumType.Function]: t_Function,
    [DatumType.Number]: t_Number,
    [DatumType.Object]: t_Object,
    [DatumType.String]: t_String,
    [DatumType.Type]: t_Type
  } = vm.platform.getBaseTypes();

  const USE_JSFN = true;
  const jslink = wrapFunction((args) => {
    if (args.length < 1)
      throw new DashError("expected at least 1 arg")
    if (! t_Array.isAssignable(args[0].type))
      throw new DashError(`arg 1 expected array, got ${args[0].type.name}`);
    if (! args[0].data.every(x => t_String.isAssignable(x.type)))
      throw new DashError(`arg 1 expected array[str]`);

    if (args[1] && ! t_Type.isAssignable(args[1].type))
      throw new DashError(`arg 2 expected type, got ${args[1].type.name}`);

    const d_keys = args[0].data as Value[];
    const js_value = globalThis[d_keys[0].data][d_keys[1].data];
    const type: ValueType = args[1]?.data ?? t_Any;

    return wrapFunction((args) => {
      if (! USE_JSFN)
        return args[0];

      return wrap(js_value, type);
    });
  });

  vm.declare("Array", {type: t_Type});
  vm.assign("Array", new Value(t_Type, t_Array));

  vm.declare("import", {type: t_Function});
  vm.assign("import", wrapFunction((args) => {
    return vm.importModule(args[0].data);
  }));
  vm.declare("input", {type: t_Function});
  vm.assign("input", wrapFunction((args) => {
    const question = args[0]?.data ?? "";
    const answer = rlsync.question(question);
    return new Value(t_String, answer);
  }));
  vm.declare("typeof", {type: t_Function});
  vm.assign("typeof", wrapFunction((args) => {
    if (args.length !== 1)
      throw new DashError("expected 1 arg, received " + args.length);
    return new Value(t_Type, args[0].type);
  }));
  vm.declare("write", {type: t_Function});
  vm.assign("write", wrapFunction((args) => {
    if (args.length === 0)
      throw new DashError("must provide an argument to output");

    let str = "";
    for (let arg of args) {
      const substr = arg.type.stringify(arg, {vm});
      process.stdout.write(substr);
      str += substr;
    }
    return new Value(t_String, str);
  }));

  vm.declare("jslink", {type: t_Function});
  vm.assign("jslink", jslink);

  vm.declare("native", {type: t_Object});
  vm.assign("native", new Value(t_Object, {}, {
    mod: wrapFunction((args) => {
      if (args.length !== 2)
        throw new DashError(`expected 2 args, received ${args.length}`);
      if (! args[0].type.extends(t_Number))
        throw new DashError(`cannot get modulo of a ${args[0].type.name}`);
      if (! args[1].type.extends(t_Number))
        throw new DashError(`arg 2 expected number, got ${args[0].type.name}`);
      const a = args[0].data;
      const b = args[1].data;
      return new Value(args[0].type, a % b);
    })
  }));

  vm.defineNs("dash", "./stdlib/");
  return vm;
}
