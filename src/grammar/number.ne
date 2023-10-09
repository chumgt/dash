@{%
  function postFloat(type: data.DatumType) {
    return function (d: any) {
      return ({ type,
        value: d[0]
      });
    };
  }

  function postInt(type: data.DatumType, base: number) {
    return function (d: any) {
      return ({ base, type,
        value: d[0]
      });
    };
  }
%}

@lexer lexer

NumberLiteral ->
  (FloatLiteral | IntegerLiteral)
    {% (d) => new expr.LiteralExpression(d[0][0]) %}

FloatLiteral ->
  float {% d => postFloat(data.DatumType.Float) %}

IntegerLiteral ->
    binint {% postInt(data.DatumType.Integer, 2) %}
  | hexint {% postInt(data.DatumType.Integer, 16) %}
  | octint {% postInt(data.DatumType.Integer, 8) %}
  | decint {% postInt(data.DatumType.Integer, 10) %}

float -> floatliteral {% d => Number.parseFloat(`${d[0]}.${d[2]}`) %}
floatliteral -> decliteral "." decliteral {% d => d.join("") %}

# decliteral -> decdigits      {% d => data.parseDecLiteral(d[0]) %}
# binliteral -> "0b" bindigits {% d => data.parseBinLiteral(d[1]) %}
# hexliteral -> "0x" hexdigits {% d => data.parseHexLiteral(d[1]) %}
# octliteral -> "0o" octdigits {% d => data.parseOctLiteral(d[1]) %}

binint -> binliteral {% d => data.parseBinLiteral(d[0]) %}
decint -> decliteral {% d => data.parseDecLiteral(d[0]) %}
hexint -> hexliteral {% d => data.parseHexLiteral(d[0]) %}
octint -> octliteral {% d => data.parseOctLiteral(d[0]) %}

binliteral -> %binliteral {% d => d[0].value %}
decliteral -> %decliteral {% d => d[0].value %}
hexliteral -> %hexliteral {% d => d[0].value %}
octliteral -> %octliteral {% d => d[0].value %}

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
