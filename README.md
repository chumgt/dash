# Dash

An experimental fun scripting language.

```lua
name := input("What's your name? ")
write("Hello, "..name.."!\n")
```

## Features

* (_Almost_) Everything is an expression.
* Strict typing. Every value has a type.
* Every type is a value.
* There is no `null`/`void`.
* Closures.

Dash is great at evaluating expressions, summing numbers, and printing "hello
world" to the console.

## Build & Test

Requires `Node >= 16`.

```sh
npm install
npx gulp

npm test
```

## Known Issues & To-dos

* Only identifiers can be dereferenced.
* Type casting is not enabled nor implicit. Integer literals are `i32`, float
  literals `f32`, string literals `str`. So it's only possible to use those
  types.
  All of the types are instances of `Type` and are implemented in a way that
  makes them easiest to use with `Vm`, which means it's actually quite terrible.
  Types are also checked at runtime, basically avoiding the entire point of
  **static** type checking, which is just silly.

* Tests are outdated.

* README does not contain enough emoji 💀

## License

MIT License. Read the `LICENSE` file.
