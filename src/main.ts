import { promises as afs } from "node:fs";
import * as fs from "node:fs";
import * as ne from "nearley";
import * as path from "node:path";
import * as yargs from "yargs";
import chalk from "chalk";
import { Type, Value } from "./data";
import { DashError } from "./error";
import { Expression, ExpressionKind } from "./expression";
import * as data from "./data";

const grammar = ne.Grammar.fromCompiled(require("./grammar/index"));

export class State {
  public readonly parent?: State;
  public readonly defs: Record<string, Value>;

  public constructor(parent?: State) {
    this.parent = parent;
    this.defs = { };
  }

  /** Clones this state. Used for closures.
   * */
  public clone(): State {
    const clone = new State(this);
    Object.assign(clone.defs, this.defs);
    return clone;
  }

  public declare(identifier: string, value: Value): Value | never {
    if (identifier in this.defs)
      throw new DashError("already defined " + identifier);
    return this.defs[identifier] = value;
  }

  public assign(identifier: string, value: Value): Value {
    const dec = this.getValue(identifier);
    if (dec.constant)
      throw new DashError("cannot assign to constant");
    if (! (dec.type & value.type))
      throw new DashError(`cannot assign ${value.type} to ${dec.type}`)

    this.defs[identifier] = value;
    return value;
  }

  public push(): State {
    const next = new State(this);
    return next;
  }

  public isDeclared(id: string): boolean {
    return (id in this.defs)
        || (this.parent?.isDeclared(id))
        || false;
  }

  public setValue(identifier: string, value: Value): never | void {
    if (identifier in this.defs)
      this.defs[identifier] = value;
    else if (this.parent)
      return this.parent.setValue(identifier, value);
    else
      throw new Error("not declared");
  }

  public getValue(identifier: string): Value | never {
    if (identifier in this.defs)
      return this.defs[identifier];
    else if (this.parent)
      return this.parent.getValue(identifier);
    else
      throw new DashError(identifier + " not defined");
  }
}

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

/** Resolve an expression to a value. */
export function resolve(expr: Expression, state: State): Value {
  switch (expr.kind) {
    case ExpressionKind.Add: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      if (! (lhs.type&Type.Number && rhs.type&Type.Number))
        throw new DashError("not numbers");

      return new Value(Type.Number, lhs.data+rhs.data);
      break }

    case ExpressionKind.Assignment: {
      if (expr["declaration"]) {
        if (expr["lhs"].kind === ExpressionKind.Dereference)
          throw new DashError("cannot declare property outside of scope");

        const id = expr["lhs"].value as string;
        if (state.isDeclared(id))
          throw new DashError("already defined " + id);

        const decl = state.declare(id, resolve(expr["rhs"], state));
        // decl.context = state;
        // decl.constant = expr["constant"];
      }
      else if (expr["lhs"].kind === ExpressionKind.Dereference) {
        const target = resolve(expr["lhs"]["lhs"], state);
        const key = expr["lhs"]["rhs"].kind === ExpressionKind.Identifier
            ? expr["lhs"]["rhs"].value
            : resolve(expr["lhs"]["rhs"], state);
        const value = resolve(expr["rhs"], state);
        target.properties[key] = value;
        return value;
      }
      else {
        const val = resolve(expr["lhs"], state);
        const res = resolve(expr["rhs"], state);

        if (val) {
          if (val?.constant)
            throw new DashError("cannot assign to constant");

          if (! (res.type & val.type))
            throw new DashError("incompatible types");

          val.data = res;
          return res;
        } else {
          state.declare(expr["lhs"].value, res);
        }
      }

      return resolve(expr["lhs"], state)! }

    case ExpressionKind.Call: {
      const target = resolve(expr["lhs"], state);
      if (! (target.type & Type.Function))
        throw new DashError("target is not a function");

      let subState = target.context!.push();
      Object.assign(subState.defs, state["defs"]);
      const params = target.params;
      const args: Value[] = expr["args"].map(x => resolve(x, subState));
      if (params.length !== args.length)
        throw new DashError(`expected ${params.length} args, received ${args.length}`);

      for (let i = 0; i < params.length; i++)
        subState.declare(params[i].name, args[i]);

      if (target.native) {
        return target.native(...expr["args"].map(x => resolve(x, subState)));
      }

      let res;
      for (const x of (target["body"] as Expression[]))
        res = resolve(x, subState);
      return res }

    case ExpressionKind.Cast: {
      const lhs = resolve(expr["lhs"], state) as Value;
      /** The type. */
      const rhs = expr["rhs"] as Type;

      return lhs.cast(rhs);

      // const val = data.cast(lhs, rhs);

      // console.log();
    }

    case ExpressionKind.Concat: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      // if (lhs.value && rhs.value) {
      //   return {
      //     type: Type.String,
      //     value: String(lhs.value).concat(String(rhs.value))
      //   };
      // }
      return new Value(Type.String, String(lhs.data).concat(String(rhs.data)));
      break }

    case ExpressionKind.Dereference: {
      const lhs = resolve(expr["lhs"], state);
      // const rhs = resolve(expr["rhs"], state);
      if (! lhs.properties)
        throw new DashError("value is not indexable");

      if (expr["rhs"].kind === ExpressionKind.Identifier) {
        const id = expr["rhs"].value;
        if (! (id in lhs.properties))
          throw new DashError("id does not exist on object");

        return lhs.properties[id];
      }

      const rhs = resolve(expr["rhs"], state);
      if (! ("value" in rhs))
        throw new DashError("unknown deref rhs");

      if (lhs["properties"][rhs.data])
        return lhs["properties"][rhs.data];

      // return {type: Type.Any};
      throw new DashError("property "+rhs.value+" does not exist on object");

      break }

    case ExpressionKind.Divide: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      if (! (lhs.type&Type.Number && rhs.type&Type.Number))
        throw new DashError("not numbers");

      return new Value(Type.Number, lhs.data/rhs.data);
      break }

    case ExpressionKind.Exponential: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      return new Value(Type.Number, lhs.data!**rhs.data!)
      }

    case ExpressionKind.Identifier:
      if (state.isDeclared(expr["value"])) {
        return state.getValue(expr["value"])!;
      }
      throw new DashError("can't resolve identifier " + expr["value"])

    case ExpressionKind.Multiply: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      if (! (lhs.type&Type.Number && rhs.type&Type.Number))
        throw new DashError("not numbers");

      return new Value(Type.Number, lhs.data*rhs.data);
      break }

    case ExpressionKind.EQ: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      return new Value(Type.Number, lhs.data===rhs.data? 1 : 0);
      break }

    case ExpressionKind.NEQ: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      return new Value(Type.Number, lhs.data!==rhs.data? 1 : 0);
      break }

    case ExpressionKind.GT: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      return new Value(Type.Number, lhs.data>rhs.data? 1 : 0);
      break }

    case ExpressionKind.GEQ: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      return new Value(Type.Number, lhs.data>=rhs.data? 1 : 0);
      break }

    case ExpressionKind.LT: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      return new Value(Type.Number, lhs.data<rhs.data? 1 : 0);
      break }

    case ExpressionKind.LEQ: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      return new Value(Type.Number, lhs.data <= rhs.data ? 1 : 0);
      break }

    case ExpressionKind.And: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      return new Value(Type.Number, (!!(lhs.data && rhs.data)) ? 1 : 0);
      break }

    case ExpressionKind.Or: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      return new Value(Type.Number, (!!(lhs.data || rhs.data)) ? 1 : 0);
      break }

    case ExpressionKind.Subtract: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      return new Value(Type.Number, lhs.data-rhs.data);
      }

    case ExpressionKind.Function: {
      const value = new Value(Type.Function, {});
      // (value as any).body = (expr as any).body;
      value.params = (expr as any).params;
      value["context"] = state;
      value["body"] = (expr as any).body;
      return value;
      // break;
    }
    case ExpressionKind.Number:
    case ExpressionKind.String:
    {
      const val = expr as any;
      return new Value(val.type, val.value);
      // return expr as any; // TODO: We know its compat, but need to make clearer.
    }

    case ExpressionKind.Comment:
      return expr as any;
  }

  throw new Error(expr.kind + " is an unresolvable expr kind");
}

let i = false;
function _dofile_(filepath: string, state = new State()): {ast: any, val: Value | never} {
  const source = fs.readFileSync(filepath, "utf8");
  const parser = new ne.Parser(grammar);

  try {
    parser.feed(source);
  } catch (ex: any) {
    console.error("Parsing error @" + ex.offset, ex);
    throw ex;
  }

//#region Built-ins
  // state.declare("__native__", {
  //   type: Type.Function,
  //   params: [
  //     {name:"filepath", type:Type.String},
  //     {name:"key", type:Type.String}],
  //   context: state,
  //   native(filepathV: Value, keyV: Value) {
  //     // TODO: This is a bit dodgy!
  //     const module: any = require(filepathV.value);
  //     const value: any = module[keyV.value];
  //     if (! value)
  //       throw new DashError("module does not export " + keyV.value);
  //     if (! ("type" in value))
  //       throw new DashError("incompatible native type");
  //     return value;
  //   }
  // });

    state.declare("__native__", data.newFunction(state,
      [{name: "filepath", type:Type.String},
       {name: "key", type:Type.String}],
      (filepath: Value, key: Value): Value => {
        const module: any = require(filepath.data);
        const value: Value = module[key.data];

        if (! value)
          throw new DashError("no export "+key.data);
        if (! ("type" in value))
          throw new DashError("incompatible native type");

        value.context = state;
        return value;
      }
    ));

    state.declare("import", data.newFunction(state,
      [{name: "filepath", type: Type.String}],
      (arg: Value) => {
        if (! (arg.type & Type.String))
          throw new DashError("expected string");
        return _import_(arg.data, state);
      }
    ));

  const var_args = new Value(Type.Any, { });
  // Add command-line args to state
  args._.slice(2).forEach((x, i) => {
    var_args.properties[i] = new Value(Type.String, x);
  });
  state.declare("args", var_args);
//#endregion

  const asts: any[] = parser.finish();
  const ast = asts[0];

  if ((! Array.isArray(ast)) || ast.length === 0)
    throw new DashError("block is missing a return value");
  if (ast.length > 1)
    console.warn(`Ambiguous (${ast.length} results)`);

  if ((!i) && (i=true))
    fs.writeFileSync("./ast.json", JSON.stringify(ast,null,2))

  for (let i = 0; i < ast.length; i++) {
    ast[i] = resolve(ast[i], state);
  }

  const res: Value = ast[ast.length - 1];
  return {ast, val:res};
}

const nss = { "dash": path.join(__dirname, "..", "stdlib") };
function _import_(name: string, state: State): Value | never {
  if (! name.endsWith(".dash"))
    name += ".dash";

  if (path.isAbsolute(name)) {
    const subState = new State();
    const module = new Value(Type.Any, {});
    _dofile_(name, subState);
    Object.assign(module.properties!, subState["defs"]);
    return module;
  }

  if (name[0] === ".")
    return _import_(path.join(process.cwd(), name), state);

  if (name.indexOf(":") >= 0) {
    const ns = name.substring(0, name.indexOf(":"));
    const pathPart = name.substring(ns.length + 1);
    if (ns in nss)
      return _import_(path.join(nss[ns], pathPart), state);
    throw new DashError("unknown import namespace " + ns);
  }

  throw new DashError("unknown import path " + name);
}

async function main() {
  if (! (args.eval || args.file)) {
    console.warn("No source file or evaluation string")
    pargs.showHelp();
    return;
  }

  const source = args.eval ?? await afs.readFile(args.file!, "utf8");
  const parser = new ne.Parser(grammar);

  let a = Date.now();
  try {
    parser.feed(source);
  } catch (ex: any) {
    console.error("Parsing error @" + ex.offset, ex);
    return;
  }

  try { // Now try running the script.
    const a = Date.now();
    const state = new State();
    const vGlobal = new Value(Type.Any, {});
    Object.assign(vGlobal.properties, state.defs);
    state.declare("global", new Value(Type.Any, {}));
    (vGlobal as any).state = state;

    const ret = _dofile_(args.file!, state);
    const res = ret.val;

    console.log(`Done in ${Date.now()-a}ms`);
    console.log(("value" in res)
        ? `= ${chalk.yellow(res.value)} (${typeof res.value})`
        : (console.log((res)), " ")+"<expr> ");
  } catch (ex) {
    throw ex;
  }
};

if (module === require.main)
  main().catch(ex => console.error(ex));
