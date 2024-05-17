#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { Liquid } = require("liquidjs")
const yaml = require("yaml")

let liquid = new Liquid()

let imports = {}
let layouts = []
let pages = []

gen()

function basename(name) {
  return path.parse(name).name
}

function gen() {
  // Index all the layouts
  layouts = fs.readdirSync("layouts")
  fs.readdirSync("imports").forEach((imp) => 
    imports[basename(imp)] = fs.readFileSync(path.join("imports", imp))
  )

  indexAllPages("pages")
  genDir("pages")

  // Copy contents of static into public
  fs.cpSync("static", "public", { recursive: true })
}

function indexAllPages(dir) {
  const ps = fs.readdirSync(dir)
  ps.forEach((page) => {
    const page_path = path.join(dir, page)
    if (fs.statSync(page_path).isDirectory()) {
      return indexAllPages(page_path)
    }
    
    let content = fs.readFileSync(page_path).toString()
    const parts = content.split("---")
    const meta_data = yaml.parse(parts[0]);

    // TODO: assert that meta data is correct

    pages.push({
      path: path.relative("pages", page_path),
      ...meta_data
    })
  })
}

function genDir(dir) {
  const ps = fs.readdirSync(dir)

  ps.forEach((page) =>
    genFile(path.join(dir, page))
  )
}

async function genFile(fpath) {
  if (fs.statSync(fpath).isDirectory()) {
    return genDir(fpath)
  }

  let content = fs.readFileSync(fpath).toString()
  const parts = content.split("---")

  // TODO: generate meta data once
  const meta_data = yaml.parse(parts[0]);

  content = await renderPage(parts[1], meta_data)
  
  // Get the path without pages/ so that it can be append to public/
  const path_rel = path.join("public", path.relative("pages", fpath)) 
  fs.mkdirSync(path.dirname(path_rel), { recursive: true })
  fs.writeFileSync(path_rel, content)
}

async function renderPage(content, meta) {
  const renderContent = () => liquid.parseAndRender(content, {
    imports: imports,
    pages: pages,
    ...meta
  })
  
  if (meta.layout) {
    const new_content = await renderContent()
    
    let layout = fs.readFileSync(path.join("layouts", meta.layout)).toString()
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
