
# Dash

A strongly-typed, interpreted scripting language.

## Features

```lua
io ::= import("dash:io");
io.write(("Hello, world!"));
0
```

* Static typing.

* Everything is an expression.
* Every expression returns a value.
* Every value has a type.
* Every type is a value.
* Null-less. There is no `null`/`nullptr`/`nil`/`undefined`/`None`/`Nothing`/
  `void`.
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

* It's slow. Parsing and executing a minimal "Hello world"
  program (which imports `io`) takes 118ms on my machine.
