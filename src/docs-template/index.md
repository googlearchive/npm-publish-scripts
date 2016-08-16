---
layout: default
---

# Releases

{% include release-list.html title="Stable" releaseData=site.data.gendoclist.releases.stable %}

{% include release-list.html title="Beta" releaseData=site.data.gendoclist.releases.beta %}

{% include release-list.html title="Alpha" releaseData=site.data.gendoclist.releases.beta %}

# Github Branches
{% for doc in site.data.gendoclist.docs %}
[View the docs for {{doc | capitalize}}]({{ doc | prepend: "/docs/" | prepend: site.github.url | replace: 'http://', 'https://' }})
{% endfor %}
