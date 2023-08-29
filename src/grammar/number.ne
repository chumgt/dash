@{%
  function basePrefixToBase(prefix) {
    switch (prefix[prefix.length - 1]) {
      case "b": return 2;
      case "o": return 8;
      case "x": return 16;
      default: return undefined;
    }
  }

  function getNumberTokenValue(token) {
    const value = token.value.substring(2);

    switch (token.value.substring(0, 2)) {
      case "0b": return Number.parseInt(value, 2);
      case "0o": return Number.parseInt(value, 8);
      case "0x": return Number.parseInt(value, 16);
    }
    return Number.parseInt(value, 10);
  }
%}

@lexer lex

Number ->
  (Float | Infinity | Integer)
    {% (d) => new expr.ValueExpression(data.Type.Number, d[0][0].value) %}

Float ->
  %float
    {% (d) => ({
      "kind": expr.ExpressionKind.Number,
      "constant": true,
      "format": "float",
      "type": data.Type.Number,
      "value": Number.parseFloat(d[0].value),
      source: d[0]
    }) %}

Integer ->
  %base2 {% (d) => ({
      "kind": expr.ExpressionKind.Number,
      "constant": true,
      "format": "base2",
      "value": getNumberTokenValue(d[0]),
      source: d[0] }) %}
  | %base8 {% (d) => ({
      "kind": expr.ExpressionKind.Number,
      "constant": true,
      "format": "base8",
      "value": getNumberTokenValue(d[0]),
      source: d[0]
    }) %}
  | %base16 {% (d) => ({
      "kind": expr.ExpressionKind.Number,
      "constant": true,
      "format": "base16",
      "value": getNumberTokenValue(d[0]),
      source: d[0]
    }) %}
  | %base10 {% (d) => ({
      "kind": expr.ExpressionKind.Number,
      "constant": true,
      "format": "base10",
      "type": data.Type.Number,
      "value": Number.parseInt(d[0].value, 10),
      source: d[0]
    }) %}

Infinity ->
  %infinity
    {% (d) => ({
      "kind": expr.ExpressionKind.Number,
      "constant": true,
      "value": Number.POSITIVE_INFINITY,
      source: d[0]
    }) %}
