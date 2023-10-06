@lexer lexer

IString -> "$" istr
  {% d => new expr.InterpolatedStringExpression(d[1]) %}

StringLiteral ->
  strliteral {% (d) => new expr.LiteralExpression({
    "type": data.DatumType.String,
    "value": d[0]
  }) %}

StringInterpolation ->
  "$" "{" Expr "}" {% d => d[2] %}

istr -> "\"" istrpart:* "\"" {% d => d[1] %}

istrpart -> StringInterpolation {% d => d[0] %}
  | istrchar:+  {% d => d[0].join("") %}
istrchar ->
  "\\" istrescape {% d => JSON.parse("\""+d.join("")+"\"") %}
  | [^\\"$]       {% id %}
istrescape -> %istrescape  {% id %}

strliteral -> "\"" strchar:* "\"" {% d => d[1].join("") %}
strchar ->
  "\\" strescape {% d => JSON.parse("\""+d.join("")+"\"") %}
  | [^\\"]       {% id %}
strescape -> %strescape {% id %}
