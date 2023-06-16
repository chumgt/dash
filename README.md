
# Dash

A strongly-typed, interpreted scripting language.

## Features & Philosophy

```lua
io ::= import("dash:io");
io.write(("Hello, world!"));
0
```

* Static typing.

* Everything is an expression.
* Every expression has a type.
* Null-less. There is no null/nullptr/nil/undefined/None/void.
* Closures.

## Build & Test

```sh
npm install
npx gulp build

npm test
```

## Known Issues

* Strings cannot contain spaces when passed as arguments, unless the strings is
  enclosed in its own parentheses. `" "` works fine. I have no idea why. This
  issue is high priority. Parsing strings is *hard*.

* It's slow. Like, *really* slow. Parsing and executing a minimal "Hello world"
  program (which imports `io`) takes 118ms on my machine (16 cores @3.7GHz,
  16GB of 1067MHz RAM). I think the language roadmap ultimately involves
  compiling to Lua or JVM bytecode instead of interpreting the AST as it is
  currently done.
