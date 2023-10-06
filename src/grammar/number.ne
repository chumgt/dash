@{%
  function postFloat(type: data.DatumType) {
    return function (token: any) {
      return ({ type,
        "value": token[0]
      });
    };
  }

  function postInt(type: data.DatumType, base: number) {
    return function (token: any) {
      const value = token[0] as number;
      return ({ base, type, value });
    };
  }
%}

@lexer lexer

NumberLiteral ->
  (FloatLiteral | IntegerLiteral)
    {% (d) => new expr.LiteralExpression(d[0][0]) %}

FloatLiteral ->
  float {% postFloat(data.DatumType.Float64) %}

IntegerLiteral ->
  binliteral   {% postInt(data.DatumType.Int64, 2) %}
  | hexliteral {% postInt(data.DatumType.Int64, 16) %}
  | octliteral {% postInt(data.DatumType.Int64, 8) %}
  | decliteral {% postInt(data.DatumType.Int64, 10) %}

float -> decliteral "." decliteral {% d => Number.parseFloat(`${d[0]}.${d[2]}`) %}

# decliteral -> decdigits      {% d => data.parseDecLiteral(d[0]) %}
# binliteral -> "0b" bindigits {% d => data.parseBinLiteral(d[1]) %}
# hexliteral -> "0x" hexdigits {% d => data.parseHexLiteral(d[1]) %}
# octliteral -> "0o" octdigits {% d => data.parseOctLiteral(d[1]) %}

decliteral -> %decliteral {% d => data.parseDecLiteral(d[0].value) %}
binliteral -> %binliteral {% d => data.parseBinLiteral(d[0].value) %}
hexliteral -> %hexliteral {% d => data.parseHexLiteral(d[0].value) %}
octliteral -> %octliteral {% d => data.parseOctLiteral(d[0].value) %}

# bindigits -> bindigit:+ {% d => d[0].join('') %}
# decdigits -> decdigit:+ {% d => d[0].join('') %}
# hexdigits -> hexdigit:+ {% d => d[0].join('') %}
# octdigits -> octdigit:+ {% d => d[0].join('') %}

# TODO: Make these more strict.
# bindigits -> %alphanum {% d => d[0].value %}
# decdigits -> %alphanum {% d => d[0].value %}
# hexdigits -> %alphanum {% d => d[0].value %}
# octdigits -> %alphanum {% d => d[0].value %}

# bindigit -> %bindigit {% d => d[0].value %}
# decdigit -> %decdigit {% d => d[0].value %}
# hexdigit -> %hexdigit {% d => d[0].value %}
# octdigit -> %octdigit {% d => d[0].value %}
