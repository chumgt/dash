<style>
code { font-family: "Comic Sans MS"; }
</style>

# Dash

An experimental interpreted scripting language.

```lua
print("Hello, world!");
```

## Features

* (_Almost_) Everything is an expression.
* Expressions can be treated as values.
* Every value has a type.
* Every type is a value.
* There is no `null`/`nullptr`/`nil`/`undefined`/`None`/`Nothing`/`void`. This
  feature could save your company a billion dollars.
* Closures.

Dash is great for evaluating expressions, summing numbers, and printing hello
world to the console.

## Build & Test

```sh
npm install
npx gulp

npm test
```

## Known Issues

* Type casting is not enabled nor implicit. Integer literals are `int32`,
  float literals `float32`, string literals `string`. So it's only possible to
  use those types.
  All of the types are instances of `Type` and are implemented in a way that
  makes them easiest to use with `Vm`, which means it's actually quite terrible.
  Types are also checked at runtime, basically avoiding the entire point of
  **static** type checking, which is just silly.

* Tests are outdated.

* README does not contain enough emoji 💀

## License

MIT License. Read the LICENSE file.
