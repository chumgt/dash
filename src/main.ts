import { promises as afs } from "node:fs";
import * as fs from "node:fs";
import * as ne from "nearley";
import * as path from "node:path";
import * as yargs from "yargs";
import chalk from "chalk";
import { Type } from "./data";
import { DashError } from "./error";
import { Expression, ExpressionKind } from "./expression";

const grammar = ne.Grammar.fromCompiled(require("./grammar/index"));

function hash(value: Value): string {
  return ""+Math.random();
}

export class State {
  public readonly parent?: State;
  private readonly defs: Record<string, Value | undefined>;

  public constructor(parent?: State) {
    this.parent = parent;
    this.defs = { };
  }

  public declare(identifier: string, value: Value): Value | never {
    if (identifier in this.defs)
      throw new DashError("already defined " + identifier);
    return this.defs[identifier] = value;
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

  public setValue(identifier: string, value: Value): void {
    if (identifier in this.defs)
      this.defs[identifier] = value;
    else if (this.parent)
      return this.parent.setValue(identifier, value);
    else
      throw new Error("not declared");
  }

  public getValue(identifier: string): Value | undefined {
    if (identifier in this.defs)
      return this.defs[identifier];
    else if (this.parent)
      return this.parent.getValue(identifier);
    else
      throw new DashError(identifier + " not defined");
  }
}

export interface Value extends Record<string, any> {
  type: Type;
  constant?: boolean;
  properties?: Record<string, Value>;
  value?: any;
}

const pargs = yargs
    .boolean("printast")
      .default("printast", true)
    .string("eval")
      .alias("eval", "e")
      .describe("eval", "The source (input) code")
    .string("file")
      .alias("file", "f")
    .epilog(chalk.bgRedBright("Dash <3 you!"));

const args = pargs.parse(process.argv);

/** Resolve an expression to a value. */
export function resolve(expr: Expression, state: State): Value {
  switch (expr.kind) {
    case ExpressionKind.Add: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      if (! (lhs.type&Type.Number && rhs.type&Type.Number))
        throw new DashError("not numbers");

      return {type: Type.Number, value: lhs.value+rhs.value};
      break }

    case ExpressionKind.Assignment: {
      if (expr["declaration"]) {
        if (expr["lhs"].kind === ExpressionKind.Dereference)
          throw new DashError("cannot declare property outside of scope");

        const id = expr["lhs"].value as string;
        if (state.isDeclared(id))
          throw new DashError("already defined " + id);

        const decl = state.declare(id, resolve(expr["rhs"], state));
        decl.constant = expr["constant"];
      }
      else if (expr["lhs"].kind === ExpressionKind.Dereference) {
        const target = resolve(expr["lhs"]["lhs"], state);
        const key = resolve(expr["lhs"]["rhs"], state);
        const value = resolve(expr["rhs"], state);
        target.properties ??= { };
        target.properties[expr["lhs"]["rhs"].value] = value;
        return value;
      }
      else {
        const val = resolve(expr["lhs"], state);
        const res = resolve(expr["rhs"], state);

        if (val) {
          if (val?.constant)
            throw new DashError("cannot assign to constant");

          if (val) {
            if (! (res.type & val.type))
              throw new DashError("incompatible types");
          }

          // state.setValue(id, res);
          val.value = res;
          return res;
        } else {
          state.declare(expr["lhs"].value, res);
        }
      }

      return resolve(expr["lhs"], state)! }

    case ExpressionKind.Concat: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      // if (lhs.value && rhs.value) {
      //   return {
      //     type: Type.String,
      //     value: String(lhs.value).concat(String(rhs.value))
      //   };
      // }
      return {
        type: Type.String,
        value: String(lhs.value).concat(String(rhs.value))
      };
      break }

    case ExpressionKind.Dereference: {
      const lhs = resolve(expr["lhs"], state);
      // const rhs = resolve(expr["rhs"], state);
      const rhs = resolve(expr["rhs"], state);
      if (! ("value" in rhs))
        throw new DashError("unknown deref rhs");
      if (! lhs.properties)
        throw new DashError("value is not indexable");

      if (lhs["properties"][rhs.value])
        return lhs["properties"][rhs.value];

      return {type: Type.Any};
        // throw new DashError("property "+rhs.value+" does not exist on object");

      break }

    case ExpressionKind.Divide: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      if (! (lhs.type&Type.Number && rhs.type&Type.Number))
        throw new DashError("not numbers");

      return {type: Type.Number, value: lhs.value/rhs.value};
      break }

    case ExpressionKind.Exponential: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      return {type: Type.Number, value: lhs.value!**rhs.value!}
      }

    case ExpressionKind.FunctionCall: {
      const target = resolve(expr["lhs"], state);
      if (! (target.type & Type.Function))
        throw new DashError("target is not a function");

      const params: any[] = target.params;
      const args: Value[] = expr["args"].map(x => resolve(x, state));
      if (params.length !== args.length)
        throw new DashError(`expected ${params.length} args, received ${args.length}`);

      const subState = state.push();
      for (let i = 0; i < params.length; i++)
        subState.declare(params[i].name, args[i]);
      let res;

      if (target.native)
        return target.native(...expr["args"].map(x => resolve(x, state)));

      for (const x of (target["body"] as Expression[]))
        res = resolve(x, subState);
      return res }

    case ExpressionKind.Identifier:
      if (state.isDeclared(expr["value"])) {
        return state.getValue(expr["value"])!;
      }
      throw new DashError("can't resolve " + expr["value"])

    case ExpressionKind.Multiply: {
      const lhs = resolve(expr["lhs"], state);
      const rhs = resolve(expr["rhs"], state);
      if (! (lhs.type&Type.Number && rhs.type&Type.Number))
        throw new DashError("not numbers");

      return {type: Type.Number, value: lhs.value*rhs.value};
      break }

    case ExpressionKind.Function:
    case ExpressionKind.Number:
    case ExpressionKind.String:
      return expr as any; // TODO: We know its compat, but need to make clearer.
  }

  throw new Error(expr.kind + " is an unresolvable expr kind");
}

function _import_(filepath: string, state: State): Value | never {
  const source = fs.readFileSync(filepath, "utf8");
  const parser = new ne.Parser(grammar);

  try {
    parser.feed(source);
  } catch (ex: any) {
    console.error("Parsing error @" + ex.offset, ex);
    throw ex;
  }

  const ast: any[] = parser.finish()[0];
  if ((! Array.isArray(ast)) || ast.length === 0)
    throw new DashError("block is missing a return value");
  if (ast.length > 1)
    console.warn("Ambiguous ("+ast.length+" results)");

  try {
    for (let i = 0; i < ast.length; i++) {
      ast[i] = resolve(ast[i], state);
    }

    const res: any = ast[ast.length - 1];
    return res;
  } catch (ex) {
    throw ex;
  }
}

async function main() {
  if (! (args.eval || args.file)) {
    console.warn("No source file or evaluation string")
    pargs.showHelp();
    return;
  }

  const source = args.eval ?? await afs.readFile(args.file!, "utf8");
  const parser = new ne.Parser(grammar);

  try {
    parser.feed(source);
  } catch (ex: any) {
    console.error("Parsing error @" + ex.offset, ex);
    return;
  }

  const ast: any[] = parser.finish()[0];
  if ((! Array.isArray(ast)) || ast.length === 0)
    throw new DashError("block is missing a return value");
  if (ast.length > 1)
    console.warn("Ambiguous ("+ast.length+" results)");

  await afs.writeFile("./ast.json", JSON.stringify(ast, null, 2));

  try { // Now try running the script.
    const state = new State();
    state.declare("import", {
      type: Type.Function,
      params: [{name:"filepath", type:Type.String}],
      native(arg: Value) {
        // TODO: Don't allow importing same file more than once.
        if (! (arg.type&Type.String))
          throw new DashError("expected a string");
        return _import_(arg.value, state); // TODO: `state` will be top-level *sigh*
      }
    });
    state.declare("print", {
      type: Type.Function,
      params: [{name: "arg0", type:Type.String}],
      native(arg0) {
        console.log(arg0.value);
        return arg0;
      }
    });
    await _import_(path.join(__dirname, "global.dash"), state);

    const var_args = {
      type: Type.Any,
      properties: {}
    };
    // Add command-line args to state
    args._.slice(2).forEach((x, i) => {
      var_args.properties[i] = {type: Type.String, value: x};
    });
    state.declare("args", var_args);

    for (let i = 0; i < ast.length; i++) {
      ast[i] = resolve(ast[i], state);
    }

    const res: any = ast[ast.length - 1];
    console.log(res?.value
        ? `= ${chalk.yellow(res.value)} (${typeof res.value})`
        : "<expr>");
  } catch (ex) {
    throw ex;
  }
};

if (module === require.main)
  main().catch(ex => console.error(ex));
performance.now()
