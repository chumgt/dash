// import fs from "node:fs";
// import paths from "node:path";
// import rlsync from "readline-sync";
// import { DatumType } from "../data.js";
// import { DashError } from "../error.js";
// import { Expression } from "../expression.js";
// import { Block, NodeKind } from "../node.js";
// import { Type, ValueType } from "../type.js";
// import { ANY, FLOAT32, FLOAT64, FUNCTION, INT16, INT32, INT64, INT8, OBJECT, STRING, TYPE } from "./types.js";
// import { FunctionValue, Value, newArray, wrap, wrapFunction } from "./value.js";
// import { FunctionOverloads } from "./function.js";
// import * as parsing from "../parse.js";
// import * as types from "./types.js";

// export type Builtins = {
//   types: Record<DatumType, any>;
//   values: Record<string, Value>;
// }

// export interface ValueHeader {
//   type: Type;
//   flags?: number;
// }

// export class VmError extends DashError { }

// export class Context {
//   protected namespaces: Record<string, string>;
//   protected definitions: Record<string, Value>;
//   protected defHeaders: Record<string, ValueHeader>;
//   protected functions: Record<string, FunctionOverloads>;
//   protected imports: Map<string, Value>;
//   protected exports: Map<string, FunctionOverloads | Value>;
//   protected stack: Value[];

//   public constructor(public readonly parent?: Context) {
//     this.namespaces = { };
//     this.defHeaders = { };
//     this.definitions = { };
//     this.functions = { };
//     this.imports = new Map();
//     this.exports = new Map();
//     this.stack = [ ];
//   }

//   public declare(identifier: string, header: ValueHeader, value: Value): void {
//     if (identifier in this.defHeaders)
//       throw new DashError("already declared " + identifier);
//     this.defHeaders[identifier] = header;
//     this.definitions[identifier] = value;
//   }

//   public assign(identifier: string, value: Value): void {
//     // if ((!this.parent) || (identifier in this.definitions))
//     //   this.definitions[identifier] = value;
//     // else if (this.parent)
//     //   this.parent.assign(identifier, value);
//     // else
//     //   throw new DashError("undeclared "+identifier);
//     if (this.has(identifier)) {
//       const ref = this.ref(identifier)!;
//       ref.vm.set(identifier, value);
//     } else {
//       this.definitions[identifier] = value;
//     }
//   }

//   protected set(identifier: string, value: Value) {
//     this.definitions[identifier] = value;
//   }

//   public defineFn(id: string, func: FunctionValue) {
//     this.functions[id] ??= new FunctionOverloads();
//     if (func.params) {
//       this.functions[id].set(func.params, func);
//     }
//   }

//   public defineNs(ns: string, dir: string): void {
//     if (ns in this.namespaces)
//       throw new VmError(`namespace '${ns}' already defined`);

//     if (! /[a-zA-Z_][a-zA-Z0-9_]*/.test(dir))
//       throw new VmError(`invalid namespace name '${ns}'`);

//     if (! dir.endsWith("/"))
//       dir += "/";

//     this.namespaces[ns] = dir;
//   }

//   public addExport(identifier: string, value?: Value): void {
//     if (value) {
//       this.exports.set(identifier, value);
//       return;
//     }

//     if (! this.has(identifier))
//       throw new DashError("unknown identifier " + identifier);

//     // const existing = this.exports.get(identifier);
//     // if (this.exports.has(identifier)) {
//     //   if (! (existing instanceof FunctionOverloads))
//     //     throw new DashError(identifier + " already exported");

//     //   existing.set(key, value)
//     // }

//     // this.exports.set(identifier, value);
//     this.exports.set(identifier, this.get(identifier));
//   }

//   public importModule(filepath: string): Value {
//     filepath = paths.normalize(filepath);
//     if (filepath in this.imports)
//       return this.imports[filepath];

//     if (! fs.existsSync(filepath)) {
//       const resolved = this.resolveImportPath(filepath);

//       if (fs.existsSync(resolved))
//         filepath = resolved;
//       else
//         throw new DashError(`module '${filepath}' not found`);
//     }

//     const content = fs.readFileSync(filepath, "utf-8");
//     const chunk = parsing.parse(content);

//     if (chunk.kind === NodeKind.Block) {
//       const module = chunk as Block;
//       const sub = this.sub();
//       module.apply(sub);
//       const value = sub.getExportsAsValue();
//       this.imports[filepath] = value;
//       return value;
//     } else if (chunk.kind === NodeKind.Expression) {
//       const expr = chunk as Expression;
//       const value = expr.evaluate(this);
//       this.imports[filepath] = value;
//       return value;
//     } else {
//       throw new DashError("importing unknown type " + chunk.kind);
//     }
//   }

//   public resolveImportPath(filepath: string): string {
//     if (! filepath.endsWith(".dash"))
//       filepath += ".dash";

//     for (let ns of Object.keys(this.namespaces)) {
//       if (filepath.startsWith(`${ns}:`)) {
//         filepath = this.namespaces[ns] + filepath.substring(ns.length+1);
//         break;
//       }
//     }

//     return filepath;
//   }

//   public newDatumValue(type: DatumType, data: any): Value {
//     return new Value(builtins.types[type], data);
//   }

//   public getExports(): Record<string, Value> {
//     const exports = { } as Record<string, Value>;
//     for (let [key, value] of this.exports)
//       exports[key] = value instanceof FunctionOverloads ? value.toValue() : value;
//     return exports;
//   }

//   public getExportsAsValue(): Value {
//     return new Value(OBJECT, 0, this.getExports());
//   }

//   public push(value: Value): void {
//     this.stack.push(value);
//   }

//   public pop(count: number): Value[];
//   public pop(count?: 1): Value;
//   public pop(count: number = 1): Value | Value[] {
//     if (count <= 0 || !Number.isInteger(count))
//       throw new VmError("pop count must be a positive, non-zero integer");
//     if (this.stack.length - count < 0)
//       throw new VmError("not enough values");

//     return (count === 1)
//       ? this.stack.pop()!
//       : this.stack.splice(this.stack.length - count);
//   }

//   public get(identifier: string): Value | never {
//     if (identifier in this.definitions)
//       return this.definitions[identifier];
//     else if (identifier in this.functions)
//       return this.functions[identifier].toValue();
//     if (this.parent)
//       return this.parent.get(identifier);
//     throw new DashError(`Undefined '${identifier}'`);
//   }

//   public has(identifier: string): boolean {
//     return (identifier in this.definitions)
//         || (identifier in this.functions)
//         || (this.parent?.has(identifier))
//         || false;
//   }

//   public ref(identifier: string): ({id:string, vm: Vm}) | void {
//     if (identifier in this.definitions)
//       return {id:identifier, vm:this};
//     if (this.parent)
//       return this.parent.ref(identifier);
//     throw new DashError(`Undefined '${identifier}'`);
//   }

//   public save(): Vm {
//     const sub = new Vm();
//     Object.assign(sub.definitions, this.definitions);
//     sub.stack.push(...this.stack);
//     return sub;
//   }

//   public sub(): Vm {
//     const sub = new Vm(this);
//     return sub;
//   }
// }

// const builtins: Builtins = {
//   types: {
//     [DatumType.Float32]: FLOAT32,
//     [DatumType.Float64]: FLOAT64,
//     [DatumType.Int8]: INT8,
//     [DatumType.Int16]: INT16,
//     [DatumType.Int32]: INT32,
//     [DatumType.Int64]: INT64,

//     [DatumType.Float]: FLOAT32,
//     [DatumType.Integer]: INT32,
//     [DatumType.Number]: FLOAT64,

//     [DatumType.Function]: FUNCTION,
//     [DatumType.String]: STRING,
//     [DatumType.Type]: TYPE,
//     [DatumType.Any]: ANY
//   },
//   values: { }
// };

// export function resolveImportPath(path: string): string {
//   if (! path.endsWith(".dash"))
//     return resolveImportPath(`${path}.dash`);

//   return paths.normalize(path);
// }

// export function newVm(): Vm {
//   const vm = new Vm();

//   const USE_JSFN = true;
//   const jslink = wrapFunction((args) => {
//     if (args.length < 1)
//       throw new DashError("expected at least 1 arg")
//     if (! types.ARRAY.isAssignable(args[0].type))
//       throw new DashError(`arg 1 expected array, got ${args[0].type.name}`);
//     if (! args[0].data.every(x => types.STRING.isAssignable(x.type)))
//       throw new DashError(`arg 1 expected array[str]`);

//     if (args[1] && ! types.TYPE.isAssignable(args[1].type))
//       throw new DashError(`arg 2 expected type, got ${args[1].type.name}`);

//     const d_keys = args[0].data as Value[];
//     const js_value = globalThis[d_keys[0].data][d_keys[1].data];
//     const type: ValueType = args[1]?.data ?? types.ANY;

//     return wrapFunction((args) => {
//       if (! USE_JSFN)
//         return args[0];

//       if (type) {
//         return type.wrap(js_value);
//       }
//       return wrap(js_value, type);
//     });
//   });

//   vm.assign("Array", new Value(types.TYPE, types.ARRAY));
//   vm.assign("array", wrapFunction((args) => {
//     return newArray(vm, args);
//   }));
//   vm.assign("import", wrapFunction((args) => {
//     return vm.importModule(args[0].data);
//   }));
//   vm.assign("input", wrapFunction((args) => {
//     const question = args[0]?.data ?? "";
//     const answer = rlsync.question(question);
//     if (args[1]) {
//       const type = args[1].data as ValueType;
//       return type.from(DatumType.String, answer);
//     } else {
//       return new Value(types.STRING, answer);
//     }
//   }));
//   vm.assign("stop", Value.ITER_STOP);
//   vm.assign("typeof", wrapFunction((args) => {
//     if (args.length !== 1)
//       throw new DashError("expected 1 arg, received " + args.length);
//     return new Value(types.TYPE, args[0].type);
//   }));
//   vm.assign("write", wrapFunction((args) => {
//     if (args.length === 0)
//       throw new DashError("must provide an argument to output");

//     let str = "";
//     for (let arg of args)
//       str += arg.data;
//     process.stdout.write(str);
//     return new Value(types.STRING, str);
//   }));
//   vm.assign("float", new Value(types.TYPE, types.FLOAT));
//   vm.assign("f32", new Value(types.TYPE, types.FLOAT32));
//   vm.assign("f64", new Value(types.TYPE, types.FLOAT64));
//   vm.assign("int", new Value(types.TYPE, types.INT));
//   vm.assign("i8", new Value(types.TYPE, types.INT8));
//   vm.assign("i16", new Value(types.TYPE, types.INT16));
//   vm.assign("i32", new Value(types.TYPE, types.INT32));
//   vm.assign("i64", new Value(types.TYPE, types.INT64));
//   vm.assign("func", new Value(types.TYPE, types.FUNCTION));
//   vm.assign("str", new Value(types.TYPE, types.STRING));
//   vm.assign("any", new Value(types.TYPE, types.ANY));

//   vm.assign("jslink", jslink);

//   vm.assign("native", new Value(types.OBJECT, {}, {
//     mod: wrapFunction((args) => {
//       if (args.length !== 2)
//         throw new DashError(`expected 2 args, received ${args.length}`);
//       if (! args[0].type.extends(types.NUMBER))
//         throw new DashError(`cannot get modulo of a ${args[0].type.name}`);
//       if (! args[1].type.extends(types.NUMBER))
//         throw new DashError(`arg 2 expected number, got ${args[0].type.name}`);
//       const a = args[0].data;
//       const b = args[1].data;
//       return new Value(args[0].type, a % b);
//     })
//   }));
//   vm.assign("new", wrapFunction((args) => {
//     const t = args[0].data;
//     const v = new Value(types.OBJECT, 0, {
//       ["foo"]: new Value(types.STRING, "bar!"),
//       ["t"]: t
//     });
//     return v;
//   }));

//   vm.defineNs("dash", "./stdlib/");
//   return vm;
// }
