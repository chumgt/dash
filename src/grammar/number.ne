@{%
  function basePrefixToBase(prefix) {
    switch (prefix[prefix.length - 1]) {
      case "b": return 2;
      case "c": return 8;
      case "x": return 16;
      default: return undefined;
    }
    //return prefix.endsWith("b")
    //  ? prefix.substring(0, prefix.length - 1)
    //  : prefix;
  }

  function newNumberToken() {}

  function getNumberTokenValue(token) {
    const value = token.value.substring(2);

    switch (token.value.substring(0, 2)) {
      case "0b": return Number.parseInt(value, 2);
      case "0c": return Number.parseInt(value, 8);
      case "0x": return Number.parseInt(value, 16);
    }
    return Number.parseInt(value, 10);
  }

  function getNumberTokenBase(token) {

  }
%}

@lexer lex

Number ->
  (Float | Infinity | Integer)
    {% (d) => d[0][0] %}
  | %lparen _ Number _ %rparen
    {% dn(2) %}
  | %minus Number
    {% (d) => {
      const tok = Object.assign({}, d[1]);
      tok.source.text = "-" + tok.source.text;
      relocateSource(tok.source, d[0]);
      return tok;
    } %}

Float ->
  %float
    {% (d) => ({
      "kind": ExpressionKind.Number,
      "constant": true,
      "format": "float",
      "type": Type.Number,
      "value": Number.parseFloat(d[0].value),
      source: d[0]
    }) %}

Integer ->
  %base2 {% (d) => ({
      "kind": ExpressionKind.Number,
      "constant": true,
      "format": "base2",
      "value": getNumberTokenValue(d[0]),
      source: d[0] }) %}
  | %base8 {% (d) => ({
      "kind": ExpressionKind.Number,
      "constant": true,
      "format": "base8",
      "value": getNumberTokenValue(d[0]),
      source: d[0]
    }) %}
  | %base16 {% (d) => ({
      "kind": ExpressionKind.Number,
      "constant": true,
      "format": "base16",
      "value": getNumberTokenValue(d[0]),
      source: d[0]
    }) %}
  | %base10 {% (d) => ({
      "kind": ExpressionKind.Number,
      "constant": true,
      "format": "base10",
      "type": Type.Number,
      "value": Number.parseInt(d[0].value, 10),
      source: d[0]
    }) %}

Infinity ->
  %infinity
    {% (d) => ({
      "kind": ExpressionKind.Number,
      "value": Number.POSITIVE_INFINITY,
      source: d[0]
    }) %}
