import fs from "node:fs";
import paths from "node:path";
import { DatumType } from "./data";
import { DashError } from "./error";
import { Expression } from "./expression";
import { Block, NodeKind } from "./node";
import { ANY, FLOAT32, FLOAT64, FUNCTION, INT16, INT32, INT64, INT8, OBJECT, STRING, TYPE, Type, ValueType } from "./type";
import { FunctionValue, Value } from "./value";
import * as parsing from "./parse";

export type Builtins = {
  types: Record<DatumType, any>;
  values: Record<string, Value>;
}

export interface ValueHeader {
  type: Type;
  flags?: number;
}

export class VmError extends DashError { }

export class Vm {
  protected namespaces: Record<string, string>;
  protected definitions: Record<string, Value>;
  protected defHeaders: Record<string, ValueHeader>;
  // protected functions: Record<string, FunctionOverloads>;
  protected imports: Map<string, Value>;
  protected exports: Set<string>;
  protected stack: Value[];

  public constructor(public readonly parent?: Vm) {
    this.namespaces = { };
    this.defHeaders = { };
    this.definitions = { };
    this.imports = new Map();
    this.exports = new Set();
    this.stack = [ ];
  }

  public declare(identifier: string, header: ValueHeader, value: Value): void {
    if (identifier in this.defHeaders)
      throw new DashError("already declared " + identifier);
    this.defHeaders[identifier] = header;
    this.definitions[identifier] = value;
  }

  public assign(identifier: string, value: Value): void {
    // if ((!this.parent) || (identifier in this.definitions))
    //   this.definitions[identifier] = value;
    // else if (this.parent)
    //   this.parent.assign(identifier, value);
    // else
    //   throw new DashError("undeclared "+identifier);
    if (this.has(identifier)) {
      const ref = this.ref(identifier)!;
      ref.vm.set(identifier, value);
    } else {
      this.definitions[identifier] = value;
    }
  }

  protected set(identifier: string, value: Value) {
    this.definitions[identifier] = value;
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

  public addExport(identifier: string): void {
    if (! this.has(identifier))
      throw new DashError("unknown identifier " + identifier);
    else if (this.exports.has(identifier))
      throw new DashError(identifier + " already exported");

    this.exports.add(identifier);
  }

  public importModule(filepath: string): Value {
    filepath = paths.normalize(filepath);
    if (filepath in this.imports)
      return this.imports[filepath];

    if (! fs.existsSync(filepath)) {
      const resolved = this.resolveImportPath(filepath);

      if (fs.existsSync(resolved))
        filepath = resolved;
      else
        throw new DashError(`module '${filepath}' not found`);
    }

    const content = fs.readFileSync(filepath, "utf-8");
    const chunk = parsing.parse(content);

    if (chunk.kind === NodeKind.Block) {
      const module = chunk as Block;
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
    return new Value(builtins.types[type], data);
  }

  public getExports(): Record<string, Value> {
    const exports = { } as Record<string, Value>;
    for (let key of this.exports)
      exports[key] = this.get(key);
    return exports;
  }

  public getExportsAsValue(): Value {
    return new Value(OBJECT, 0, this.getExports());
  }

  public push(value: Value): void {
    this.stack.push(value);
  }

  public pop(count: number): Value[];
  public pop(count?: 1): Value;
  public pop(count: number = 1): Value | Value[] {
    if (count <= 0 || !Number.isInteger(count))
      throw new VmError("pop count must be a positive, non-zero integer");
    if (this.stack.length - count < 0)
      throw new VmError("not enough values");

    return (count === 1)
      ? this.stack.pop()!
      : this.stack.splice(this.stack.length - count);
  }

  public get(identifier: string): Value | never {
    if (identifier in this.definitions)
      return this.definitions[identifier];
    if (this.parent)
      return this.parent.get(identifier);
    throw new DashError(`Undefined '${identifier}'`);
  }

  public has(identifier: string): boolean {
    return (identifier in this.definitions)
        || (this.parent?.has(identifier))
        || false;
  }

  public ref(identifier: string): ({id:string, vm: Vm}) | void {
    if (identifier in this.definitions)
      return {id:identifier, vm:this};
    if (this.parent)
      return this.parent.ref(identifier);
    throw new DashError(`Undefined '${identifier}'`);
  }

  public save(): Vm {
    const sub = new Vm();
    Object.assign(sub.definitions, this.definitions);
    sub.stack.push(...this.stack);
    return sub;
  }

  public sub(): Vm {
    const sub = new Vm(this);
    return sub;
  }
}

const builtins: Builtins = {
  types: {
    [DatumType.Float32]: FLOAT32,
    [DatumType.Float64]: FLOAT64,
    [DatumType.Int8]: INT8,
    [DatumType.Int16]: INT16,
    [DatumType.Int32]: INT32,
    [DatumType.Int64]: INT64,

    [DatumType.Float]: FLOAT32,
    [DatumType.Integer]: INT32,
    [DatumType.Number]: FLOAT64,

    [DatumType.Function]: FUNCTION,
    [DatumType.String]: STRING,
    [DatumType.Type]: TYPE,
    [DatumType.Any]: ANY
  },
  values: { }
};

export function resolveImportPath(path: string): string {
  if (! path.endsWith(".dash"))
    return resolveImportPath(`${path}.dash`);

  return paths.normalize(path);
}
