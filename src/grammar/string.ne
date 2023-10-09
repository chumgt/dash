@{%
  function quote(str: string): string {
    return `"${str}"`;
  }
  function str(x: string): string {
    return JSON.parse(quote(x.replace("\n", "\\n")));
  }
%}

@lexer lexer

IString -> "i" istr
  {% d => new expr.InterpolatedStringExpression(d[1]) %}

IStringInterpolation ->
  "{" Expr "}" {% d => d[1] %}

StringLiteral ->
  strliteral {% (d) => new expr.LiteralExpression({
    "type": data.DatumType.String,
    "value": d[0]
  }) %}

istr -> "\"" istrpart:* "\"" {% d => d[1] %}

istrpart ->
  IStringInterpolation {% d => d[0] %}
  | istrchar:+         {% d => str(d[0].join("")) %}
istrchar ->
  "\\" "{"          {% d => "{" %}
  | "\\" istrescape {% d => d.join("") %}
  | [^\\"\{]        {% id %}
istrescape ->
  strescape  {% id %}

strliteral ->
  "\"" strchar:* "\"" {% d => str(d[1].join("")) %}
strchar ->
  "\\" strescape {% d => d.join("") %}
  | [^\\"]       {% id %}
strescape ->
  [bnrt\\] {% id %}
