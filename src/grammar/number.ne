@{%
  function postInt(type: data.DatumType, base: number) {
    return function (token: any) {
      return ({ ...token, base,
        "type": type,
        "value": token[0].value,
      });
    };
  }
%}

@lexer lexer

NumberLiteral ->
  (FloatLiteral | IntegerLiteral)
    {% (d) => new expr.LiteralExpression(d[0][0]) %}

FloatLiteral ->
  %float
    {% (d) => ({
      ...d[0],
      "type": data.DatumType.Float64,
      "value": d[0].value
    }) %}

IntegerLiteral ->
  %base2 {% postInt(data.DatumType.Int64, 2) %}
  | %base8 {% postInt(data.DatumType.Int64, 8) %}
  | %base10 {% postInt(data.DatumType.Int64, 10) %}
  | %base16 {% postInt(data.DatumType.Int64, 16) %}
