---
layout: archive
permalink: /archives/
title: "Archives"
---

## Posts by Tags  

{% include group-by-array collection=site.posts field="tags" %}

{% for tag in group_names %}
  {% assign posts = group_items[forloop.index0] %}
  <h3 id="{{ tag | slugify }}" class="archive__subtitle">{{ tag }}</h3>
  {% for post in posts %}
    {% include archive-single.html %}
  {% endfor %}
{% endfor %}

## Posts by Year  

{% capture written_year %}'None'{% endcapture %}
{% for post in site.posts %}
  {% capture year %}{{ post.date | date: '%Y' }}{% endcapture %}
  {% if year != written_year %}
    <h3 id="{{ year | slugify }}" class="archive__subtitle">{{ year }}</h3>
    {% capture written_year %}{{ year }}{% endcapture %}
  {% endif %}
  {% include archive-single.html %}
{% endfor %}
