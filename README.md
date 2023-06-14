
# Dash

* Everything is an expression
* Null-less. There is no null or equivalent
* Closures

## Build

```sh
npm install
npx gulp build

npm test
```

## Known Issues

* Only arithmetic operators honour order of operations, nothing else is
  explicitly ordered. Therefore, if a script doesn't work and you think it
  should, try using parentheses to explicitly order them.

  For example, `5 + 2 * 8` will correctly produce `21`, but `x * f() + 5` may
  not, so try changing it to `(x * (f())) + (5)`. This is obviously a huge issue
  and is being worked on.

* Error messages are not very helpful. The most common causes errors are
  malformed scripts (invalid programs) and parsing errors (see previous point).
