import test from "ava";
import * as dash from "./../src/main";

test("Concat", (test) => {
  const res = dash.dostring(`"a"..("bc".."d").."e"`);
  test.is(res.val.data, "abcde");
  test.pass();
});

test("Equality", (test) => {
  const res0 = dash.evaluate(`32==32`);
  test.is(res0.data, 1);
  const res1 = dash.evaluate(`32==40`);
  test.is(res1.data, 0);
  const res2 = dash.evaluate(`32!=32`);
  test.is(res2.data, 0);
  const res3 = dash.evaluate(`32!=40`);
  test.is(res3.data, 1);

  test.is(dash.evaluate(`"foo"==("f".."oo")`).data, 1);
  test.is(dash.evaluate(`"foo"!=("b".."oo")`).data, 1);

  test.pass();
});
