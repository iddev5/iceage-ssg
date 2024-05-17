#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { Liquid } = require("liquidjs")

const src = {
  pages: "./src/pages",
  layouts: "./src/layouts",
  imports: "./src/imports",
  static: "./src/static",
}

let liquid = new Liquid()

let imports = {}
let layouts = []
let pages = []

gen()

function gen() {
  // Index all the layouts
  layouts = fs.readdirSync(src.layouts)
  fs.readdirSync(src.imports).forEach((imp) => 
    imports[imp.split('.')[0]] = fs.readFileSync(`${src.imports}/${imp}`)
  )

  indexAllPages(src.pages)
  genDir(src.pages)

  // Copy contents of static into public
  fs.cpSync(src.static, './public/', { recursive: true })
}

function indexAllPages(path) {
  const ps = fs.readdirSync(path)
  ps.forEach((page) => {
    const page_path = `${path}/${page}`
    if (fs.statSync(page_path).isDirectory()) {
      indexAllPages(page_path)
    }
    
    let content = fs.readFileSync(page_path).toString()
    const parts = content.split("---")
    const meta_data = JSON.parse(parts[0]);

    // TODO: assert that meta data is correct

    pages.push({
      path: page,
      ...meta_data
    })
  })
}

function genDir(path) {
  const ps = fs.readdirSync(path)

  ps.forEach((page) =>
    genFile(`${path}/${page}`, page)
  )
}


async function genFile(path, name) {
  if (fs.statSync(path).isDirectory()) {
    return genDir(path)
  }

  let content = fs.readFileSync(path).toString()
  const parts = content.split("---")

  // TODO: generate meta data once
  const meta_data = JSON.parse(parts[0]);

  content = await renderPage(parts[1], meta_data)
  fs.writeFileSync(`./public/${name}`, content)
}

async function renderPage(content, meta) {
  const renderContent = () => liquid.parseAndRender(content, {
    imports: imports,
    pages: pages,
    ...meta
  })
  
  if (meta.layout) {
    const new_content = await renderContent()
    
    let layout = fs.readFileSync(`${src.layouts}/${meta.layout}`).toString()
    return await liquid.parseAndRender(layout, {
      content: new_content,
      meta: meta,
      pages: pages,
      imports: imports,
    })  
  } else {
    return await renderContent()
  }
}
