import { DashError } from "../error.js";
import { FnArguments, FnParameters } from "../function.js";
import { FunctionValue, NativeFunctionValue, Value } from "./value.js";
import * as types from "./types.js";

export interface CallContext {
  target: Value;
  arguments: Value[];
}

export interface OverloadMatch {
  params: FnParameters;
  impl: FunctionValue;
}

export class FunctionOverloads {
  protected readonly impls: [string, FnParameters, FunctionValue][] = [];

  public set(key: FnParameters, value: FunctionValue): this {
    this.impls.push([hashParams(key), key, value]);
    return this;
  }
  public get(params: FnParameters): FunctionValue | undefined {
    const key = hashParams(params);
    for (let pair of this.impls) {
      if (key === pair[0])
        return pair[2];
    }
  }
  public has(params: FnParameters): boolean {
    return !! this.get(params);
  }

  public getMatchingImpl(args: FnArguments): FunctionValue | undefined {
    const match = this.getNearestMatch(args);
    return match ? this.get(match) : undefined;
  }

  public getNearestMatch(args: FnArguments): FnParameters | undefined {
    let nearest: FnParameters | undefined = undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let match of this.getMatches(args)) {
      const distance = getArgsDistance(args, match);
      if (distance < nearestDistance) {
        nearest = match;
        nearestDistance = distance;
      } else if (distance === nearestDistance) {
        throw new DashError("identical matches");
      }
    }

    return nearest;
  }

  public *getMatches(args: FnArguments): Iterable<FnParameters> {
    for (let sig of this.getHeaders()) {
      if (assignableParams(args, sig))
        yield sig;
    }
  }

  public *getHeaders(): Iterable<FnParameters> {
    for (let pair of this.impls)
      yield pair[1];
  }

  public *entries(): Iterable<[FnParameters, FunctionValue]> {
    for (let pair of this.impls)
      yield [pair[1], pair[2]];
  }

  public toValue(): Value {
    return new NativeFunctionValue((args, ctx) => {
      const argsT: FnArguments = args.map(x => ({type: x.type}));
      const call = this.getMatchingImpl(argsT);
      if (! call) {
        let message = `[${args.map(x => x.type.name).join(", ")}]\n`;
        for (const im of this.getHeaders()) {
          message += `Found [${hashParams(im)}]\n`;
        }
        throw new DashError("no match for args " + message);
      }

      const margs = args.map((x, i) =>
          new Value(call.params![i].type as any, x.data));
      return call.call(ctx.vm, margs);
    });
  }
}

export function assignableParams(args: FnArguments, params: FnParameters): boolean {
  const [minN, maxN] = getRequiredArgCount(params);

  if (args.length < minN || args.length > maxN)
    return false;

  // for (let i = 0; i < params.length; i++) {
  //   const param = params[i];
  //   const arg = args[i];
  //   if (! param.required)
  //     break;
  //   if (param.type === types.ANY)
  //     continue;
  //   if (! arg.type.isImplicitCastableTo(param.type))
  //     return false;
  // }
  for (let i = 0; i < args.length; i++) {
    const [arg, param] = [args[i], params[i]];

    if (! param) {
      // Too many args
      return false;
    }

    if (param.type === types.ANY) {
      // Everything is assignable to `any`
      continue;
    }

    if (! arg.type.isImplicitCastableTo(param.type))
      return false;

    if (! param.required)
      break;
  }

  return true;
}

export function getArgsDistance(args: FnArguments, params: FnParameters): number | never {
  if (args.length === 0 && params.length === 0)
    return 0;

  let distances: number[] = [ ];
  for (let i = 0; i < args.length; i++) {
    const [param, arg] = [params[i], args[i]];
    const distance = arg.type.getDistance(param.type);
    distances.push(distance);
  }

  const sum = distances.reduce((x, r) => x + r, 0);
  return sum / distances.length;
}

export function getRequiredArgCount(params: FnParameters): [number, number] {
  let min = 0, max = 0;
  for (let param of params) {
    if (param.required)
      min += 1;
    max += 1;
  }
  return [min, max];
}

export function hashParams(params: FnParameters): string {
  return params.map(x => x.type.name).join(", ");
}
