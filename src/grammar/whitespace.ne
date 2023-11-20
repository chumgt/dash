@lexer lexer

_  -> __:? {% () => null %}
__ -> %ws  {% () => null %}
