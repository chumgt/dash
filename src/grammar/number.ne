
@lexer lex

Number ->
  (Float | Integer)
    {% (d) => new expr.ValueExpression(d[0][0]) %}

Float ->
  %float
    {% (d) => ({
      "type": data.DatumType.Float32,
      "value": d[0].value,
      source: d[0]
    }) %}

Integer ->
  %base2 {% (d) => ({
      "type": data.DatumType.Int32,
      "base": 2,
      "value": d[0].value,
      source: d[0]
    }) %}
  | %base8 {% (d) => ({
      "type": data.DatumType.Int32,
      "base": 8,
      "value": d[0].value,
      source: d[0]
    }) %}
  | %base16 {% (d) => ({
      "type": data.DatumType.Int32,
      "base": 16,
      "value": d[0].value,
      source: d[0]
    }) %}
  | %base10 {% (d) => ({
      "type": data.DatumType.Int32,
      "base": 10,
      "value": d[0].value,
      source: d[0]
    }) %}
