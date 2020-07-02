---
layout: default
---

# Hold up, fizzbuzz with Liquid template tags?

{% for item in (1..100) %}
    {%- assign mod3 = item | modulo: 3 -%}
    {%- assign mod5 = item | modulo: 5 -%}
    {% if mod3 == 0 and mod5 == 0 %}
        FizzBuzz
    {% elsif mod3 == 0 %}
        Fizz
    {% elsif mod5 == 0 %}
        Buzz
    {% else %}
        {{ item }}
    {% endif %}
{%- endfor -%}