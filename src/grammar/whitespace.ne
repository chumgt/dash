@lexer lex

_  -> __:? {% () => null %}
__ -> %ws {% () => null %}
