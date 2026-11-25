---
layout: page
permalink: /publications/
title: publications
description: "* denotes equal contribution."
nav: true
nav_order: 2
---

<!-- _pages/publications.md -->

<div class="publications">

<h2 class="bibliography">Under Review</h2>
{% bibliography --query @*[journal=Under review] --group_by none %}

{% bibliography --query @*[journal!=Under review] %}

</div>

For earlier publications, see [Google Scholar](https://scholar.google.com/citations?user=pkez5wUAAAAJ&hl=en).
