
@lexer lex
@preprocessor typescript

TLiteral ->
  TNil  {% id %}
  | TFloat  {% id %}
  | TNumber {% id %}
  | TString {% id %}

TNil ->
  %nil
    {% (d) => ({
      type: "value",
      value: null
    }) %}

TFloat ->
  %float
    {% (d) => {
      const number = Number.parseFloat(d[0].value);
      const value = new Value(T_NUMBER, number);
      return ValueToken(value, null);
    } %}

TNumber ->
  %int
    {% (d) => {
      const number = Number.parseFloat(d[0].value);
      const value = new Value(T_NUMBER, number);
      return ValueToken(value, null);
    } %}

TString ->
  %str
    {% (d) => d[0].value %}
