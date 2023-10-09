import { Type } from "./type.js";
import * as types from "./vm/types.js";

export interface FnArgument {
  type: Type;
}

export interface FnParameter {
  name: string;
  type: Type;
  required: boolean;
}

export type FnArguments = FnArgument[];
export type FnParameters = FnParameter[];

/**
 * Determine if the arguments `args` are assignable to the parameters `params`.
 * @param args The arguments to test.
 * @param params The parameters to match.
 * @returns
 */
export function assignableParams(args: FnArguments, params: FnParameters): boolean {
  const [minN, maxN] = getRequiredArgCount(params);

  if (args.length < minN || args.length > maxN)
    return false;

  for (let i = 0; i < args.length; i++) {
    const param = params[i]
        , arg = args[i];

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

/**
 * Calculate the "distance" between the arguments' types and the parameters'
 * types.
 *
 * The returned number is arbitrary, but lower numbers always mean a closer
 * relationship between between the types than a higher number.
 * @param args The arguments to test.
 * @param params The parameters to match.
 * @returns
 */
export function getArgsDistance(args: FnArguments, params: FnParameters): number | never {
  if (args.length === 0 && params.length === 0)
    return 0;

  let distances: number[] = [ ];
  for (let i = 0; i < args.length; i++) {
    const param = params[i]
        , arg = args[i];
    const distance = arg.type.getDistance(param.type);
    distances.push(distance);
  }

  const sum = distances.reduce((x, r) => x + r, 0);
  return sum / distances.length;
}

/**
 * Determine the minimum and maximum argument count.
 * @param params The parameters.
 * @returns
 */
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
