import test from "ava";
import * as dashtest from "./env";

test("Unary", (test) => {
  const res0 = dashtest.dostring(`-42`);
  test.is(res0.data, -42);
  const res1 = dashtest.dostring(`+42`);
  test.is(res1.data, 42);
  const res2 = dashtest.dostring(`--42`);
  test.is(res2.data, 42);
  const res3 = dashtest.dostring(`+-42`);
  test.is(res3.data, -42);
  test.pass();
});

test("PEMDAS", (test) => {
  const res0 = dashtest.dostring("8*6/3");
  test.is(res0.data, 16.0);
  const res1 = dashtest.dostring("8/6*3");
  test.is(res1.data, 4.00);
  const res2 = dashtest.dostring("(8+6)/2");
  test.is(res2.data, 7.00);
  const res3 = dashtest.dostring("8+(6/2)");
  test.is(res3.data, 11.0);
  const res4 = dashtest.dostring("8**2/4");
  test.is(res4.data, 16.0);
  const res5 = dashtest.dostring("8/2**4");
  test.is(res5.data, 0.50);
  const res6 = dashtest.dostring("5+6-2*4/8");
  test.is(res6.data, 10.0);
  const res7 = dashtest.dostring("5+(6-2)*4/8");
  test.is(res7.data, 7.00);
  const res8 = dashtest.dostring("5+((6-2)*4)/8");
  test.is(res8.data, 7.00);
  test.pass();
});
