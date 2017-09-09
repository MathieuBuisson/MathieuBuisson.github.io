---
layout: archive
title: Search
permalink: /search/
---

<div class="search-container">
  <form action="{{ page.url | absolute_url }}" method="get">
    <label for="search-box"></label>
    <input type="text" id="search-box" name="query" placeholder="Search posts" style="width:50%" autofocus>
    <button class="btn btn--info" type="submit"> &nbsp;<i class="fa fa-search" aria-hidden="true"></i> &nbsp;</button>
  </form>
  <div id="search-results" class="search-results"></div>
</div>

<script>
  window.store = {
    {%- for post in site.posts -%}
      "{{ post.url | slugify }}": {
        "title": "{{ post.title | xml_escape }}",
        "content": {{ post.content | strip_html | strip_newlines | jsonify }},
        "date": "{{ post.date | date: '%m/%d/%Y' | xml_escape }}",
        "url": "{{ post.url | absolute_url }}"
      }
      {%- unless forloop.last -%},{%- endunless -%}
    {%- endfor -%}
  };
</script>
<script src='{{- "/js/lunr.min.js" | absolute_url -}}'></script><script src='{{- "/js/search.js" | absolute_url -}}'></script>