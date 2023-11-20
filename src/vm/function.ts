import { DashError } from "../error.js";
import { FnArguments, FnParameters } from "../function.js";
import { FunctionValue, NativeFunctionValue, Value } from "./value.js";
import * as fns from "../function.js";

export interface CallContext {
  target: Value;
  arguments: Value[];
}

export interface OverloadMatch {
  params: FnParameters;
  impl: FunctionValue;
}

export class FunctionOverloads {
  protected readonly impls: FunctionValue[] = [];

  public add(value: FunctionValue): this {
    this.impls.push(value);
    return this;
  }

  public getNearestMatch(args: FnArguments): FunctionValue | undefined {
    let nearest: FunctionValue | undefined = undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let match of this.getMatches(args)) {
      if (! match.params) {
        if (! nearest) {
          nearest = match;
          nearestDistance = 0;
        }
        continue;
      }

      const distance = fns.getArgsDistance(args, match.params);
      if (distance < nearestDistance) {
        nearest = match;
        nearestDistance = distance;
      } else if (distance === nearestDistance) {
        throw new DashError("identical matches");
      }
    }

    return nearest;
  }

  public *getMatches(args: FnArguments): Iterable<FunctionValue> {
    for (let impl of this.entries()) {
      if (impl.isCallableWithArgs(args))
        yield impl;
    }
  }

  public *entries(): Iterable<FunctionValue> {
    for (let pair of this.impls)
      yield pair;
  }

  public toValue(): Value {
    return new NativeFunctionValue((args, ctx) => {
      const match = this.getNearestMatch(args);

      if (! match) {
        let message = `[${args.map(x => x.type.name).join(", ")}]\n`;
        for (const im of this.entries()) {
          message += `Found [${fns.hashParams(im.params??[])}]\n`;
        }
        throw new DashError("no match for args " + message);
      }

      return match.call(ctx.vm, args);
    });
  }
}
