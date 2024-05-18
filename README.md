# iceage
Small, simple static site generator with no nonsense features. It is a minimalistic tool to automate tedious parts of a static website.  

Written in JavaScript. Iceage operates on HTML files with Liquid templates embedded.

## Installation
```sh
npm install --save-dev iceage-ssg
```

Once installed, check the version using:
```sh
iceage --version
```

## Getting Started
The structure of a Iceage website is as follows
```
./
- layouts/
  - default.html
  - blogs.html
- imports/
  - header.html
  - footer.html
- pages/
  - index.html
  - posts/
    - post1.html
    - post2.html
- static/
  - style.css
  - main.js
  - favicon.ico
```

`pages/` are the root of your website. It contains the pages which your actual site will have. Each file in `pages/` represent a unique page. A page may have a frontmatter at the top which is written in YAML. It is folowed by the actual page content - HTML tree with liquid. The two parts are separated by a `---`.

Sample index.html
```html
title: Homepage
draft: false
layout: default.html
tags: [ home ]
---
<h1>This is the homepage</h1>
<p>Loren ipsum</p>
...
```

Layout on the other hand do not contain frontmatter. But layouts can access the contents of the page on which it is being applied to using the `content` variable and its info using the `meta` object.
```html
<!doctype html>
<html>
  <head>
    <title>{{meta.title}}</title>
  </head>
  <body>
    {{imports.header}}
    {{content}}
    {{imports.footer}}
  </body>
</html>
```

Here the `imports` object is used to access the content of all the imported HTML files. An import file is a plain HTML file which is replaced as-is in a layout or a page.
```html
<div class="header">
  <ul>
    <li>Home</li>
    <li>Blogs</li>
    <li>Gallery</li>
    <li>Contacts</li>
  </ul>
</div>
```

Apart from that, the `page` object can be used to access all the pages present in the workspace. It is a list (array) where all the elements are an object having a `path` property and all the meta data (frontmatter) of that page.

Finally, the contents of the `static/` directory is copied as-is to your final generated site. It can be used to keep JavaScript files, CSS files, icons, images etc.

In order to generate the website, simply run the CLI:
```sh
iceage
```

To run the CLI in live-reload mode which hosts the website in a web server and hot reloads it based on changes:
```sh
iceage --reload
```
Optionally, `--open` flag may be used to automatically open the browser window pointing to the URL where the website is hosted.
