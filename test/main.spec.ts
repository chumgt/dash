import test from "ava";
import * as dash from "./../src/index";
import { ExpressionKind } from "../src/expression";

test("Resolve", (test) => {
  const state = new dash.State();
  const res = dash.resolve({
    kind: ExpressionKind.String,
    value: "Hello, world!"
  } as any, state);

  test.is(res.value, "Hello, world!");
  test.pass();
});
