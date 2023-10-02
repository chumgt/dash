@{%
  function postInt(type: data.DatumType, base: number) {
    return function (token: any) {
      return ({
        type, base,
        "value": token[0].value,
        "source": token[0]
      });
    };
  }
%}

@lexer lexer

NumberLiteral ->
  (FloatLiteral | IntegerLiteral)
    {% (d) => new expr.ValueExpression(d[0][0]) %}

FloatLiteral ->
  %float
    {% (d) => ({
      "type": data.DatumType.Float32,
      "value": d[0].value,
      source: d[0]
    }) %}

IntegerLiteral ->
  %base2 {% postInt(data.DatumType.Int32, 2) %}
  | %base8 {% postInt(data.DatumType.Int32, 8) %}
  | %base10 {% postInt(data.DatumType.Int32, 10) %}
  | %base16 {% postInt(data.DatumType.Int32, 16) %}
