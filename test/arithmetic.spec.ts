import test from "ava";
import * as dash from "./../src/main";

test("Unary", (test) => {
  const res0 = dash.evaluate(`-42`);
  test.is(res0.data, -42);
  const res1 = dash.evaluate(`+42`);
  test.is(res1.data, 42);
  const res2 = dash.evaluate(`--42`);
  test.is(res2.data, 42);
  const res3 = dash.evaluate(`+-42`);
  test.is(res3.data, -42);
  test.pass();
});

test("PEMDAS", (test) => {
  const res0 = dash.dostring("8*6/3");
  test.is(res0.val.data, 16.0);
  const res1 = dash.dostring("8/6*3");
  test.is(res1.val.data, 4.00);
  const res2 = dash.dostring("(8+6)/2");
  test.is(res2.val.data, 7.00);
  const res3 = dash.dostring("8+(6/2)");
  test.is(res3.val.data, 11.0);
  const res4 = dash.dostring("8**2/4");
  test.is(res4.val.data, 16.0);
  const res5 = dash.dostring("8/2**4");
  test.is(res5.val.data, 0.50);
  const res6 = dash.dostring("5+6-2*4/8");
  test.is(res6.val.data, 10.0);
  const res7 = dash.dostring("5+(6-2)*4/8");
  test.is(res7.val.data, 7.00);
  const res8 = dash.dostring("5+((6-2)*4)/8");
  test.is(res8.val.data, 7.00);
  test.pass();
});
