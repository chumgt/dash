import { DashError } from "./error.js";
import { ModuleNode } from "./node.js";

export interface Compiler<T = any> {
  compile(chunk: ModuleNode): T;
}

export class DashCompileError extends DashError { }
