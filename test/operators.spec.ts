import test from "ava";
import * as dashtest from "./env";

test("Concat", (test) => {
  const res = dashtest.dostring(`"a"..("bc".."d").."e"`);
  test.is(res.data, "abcde");
  test.pass();
});

test("Equality", (test) => {
  const res0 = dashtest.dostring(`32==32`);
  test.is(res0.data, 1);
  const res1 = dashtest.dostring(`32==40`);
  test.is(res1.data, 0);
  const res2 = dashtest.dostring(`32!=32`);
  test.is(res2.data, 0);
  const res3 = dashtest.dostring(`32!=40`);
  test.is(res3.data, 1);

  test.is(dashtest.dostring(`"foo"==("f".."oo")`).data, 1);
  test.is(dashtest.dostring(`"foo"!=("b".."oo")`).data, 1);

  test.pass();
});
