// import fs from "node:fs";
import paths from "node:path";
import { Datum, DatumType } from "./data";
import { DashError } from "./error";
import { FLOAT32, INT16, INT32, INT64, INT8, OBJECT, STRING, Type } from "./type";
import { Value } from "./value";
import { Node, Visitor } from "./node";
import { Statement } from "./statement";
import { Expression } from "./expression";

export class VmError extends DashError { }

export class Vm
implements Visitor<Node> {
  public static alloc(bytes: number): Vm {
    const buffer = Buffer.alloc(bytes);
    return new Vm(buffer);
  }

  protected definitions: Record<string, Value>;
  protected types: Record<string, Type>;
  public readonly exports: Set<string>;
  protected stack: Datum[];
  private ptr: number;

  public constructor(public readonly buffer: ArrayBufferLike) {
    this.definitions = { };
    this.types = { };
    this.exports = new Set();
    this.stack = [ ];
    this.ptr = 0;
  }

  public alloc(bytes: number): DataView {
    if (this.ptr + bytes > this.buffer.byteLength)
      throw new VmError("out of memory!");
    const view = new DataView(this.buffer, this.ptr, bytes);
    this.ptr += bytes;
    return view;
  }

  public assign(identifier: string, value: Value, flags?: number): void {
    this.definitions[identifier] = value;
  }

  public defineType(identifier: string, type: Type): void {
    this.types[identifier] = type;
  }

  public addExport(identifier: string): void {
    if (! this.has(identifier))
      throw new DashError("unknown identifier " + identifier);
    else if (this.exports.has(identifier))
      throw new DashError(identifier + " already exported");

    this.exports.add(identifier);
  }

  public newValue(type: DatumType, data: any): Value {
    return new Value(this.getDataType(type), data);
  }

  public getDataType(type: DatumType): Type {
    switch (type) {
      case DatumType.Float32: return FLOAT32;
      case DatumType.Int8: return INT8;
      case DatumType.Int16: return INT16;
      case DatumType.Int32: return INT32;
      case DatumType.Int64: return INT64;
      case DatumType.String: return STRING;
      default: throw new DashError(`unknown type ${type}`);
    }
  }

  public getExportsAsValue(): Value {
    const exports: Record<string, Value> = { };
    for (let key of this.exports)
      exports[key] = this.get(key);
    return new Value(OBJECT, 0, exports);
  }

  public push(datum: Datum): void {
    this.stack.push(datum);
  }

  public pop(): Datum {
    if (this.stack.length === 0)
      throw new DashError("empty stack");
    return this.stack.pop()!;
  }

  public get(identifier: string): Value | never {
    if (identifier in this.definitions)
      return this.definitions[identifier];
    throw new DashError(`Undefined '${identifier}'`);
  }

  public has(identifier: string): boolean {
    return identifier in this.definitions;
  }

  public save(): Vm {
    const sub = new Vm(Buffer.from(this.buffer));
    Object.assign(sub.definitions, this.definitions);
    sub.stack.push(...this.stack);
    return sub;
  }


  public visit(node: Node): void {
    throw new Error("Not implemented!");
    // switch (node.kind) {
    //   case NodeKind.Expression:
    //     return this.visitExpression(node as Expression);
    //   case NodeKind.Statement:
    //     return this.visitStatement(node as Statement);
    // }
  }

  protected visitExpression(expr: Expression) {

  }

  protected visitStatement(stmt: Statement) {

  }
}

// export class ExpressionVisitor
// implements Visitor<Expression> {
//   public visit(node: Expression): void {
//     switch (node.type) {
//       case ExpressionKind.Multiply:

//     }
//   }
// }

export function resolveImportPath(path: string): string {
  if (! path.endsWith(".dash"))
    return resolveImportPath(`${path}.dash`);

  return paths.normalize(path);
}
