#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { Liquid } = require("liquidjs");
const yaml = require("yaml");

let liquid = new Liquid();

let imports = {};
let layouts = [];
let pages = [];

gen();

function basename(name) {
  return path.parse(name).name;
}

function gen() {
  // Index all the layouts
  if (fs.existsSync("layouts")) layouts = fs.readdirSync("layouts");

  if (fs.existsSync("imports"))
    fs.readdirSync("imports").forEach(
      (imp) =>
        (imports[basename(imp)] = fs.readFileSync(path.join("imports", imp)))
    );

  if (fs.existsSync("pages")) {
    indexAllPages("pages");
    genDir("pages");
  } else {
    console.error("No pages to render.");
    return;
  }

  // Copy contents of static into public
  if (fs.existsSync("static"))
    fs.cpSync("static", "public", { recursive: true });

  console.log("Site written to ./public");
}

function indexAllPages(dir) {
  const ps = fs.readdirSync(dir);
  ps.forEach((page) => {
    const page_path = path.join(dir, page);
    if (fs.statSync(page_path).isDirectory()) {
      return indexAllPages(page_path);
    }

    const full_path = path.relative("pages", page_path);

    let content = fs.readFileSync(page_path).toString();
    const parts = content.split("---");

    // Treat first part as meta data only if there are multiple parts
    // For example the string "---hello" returns two parts ["", "hello"]
    // But "hello" returns only one ["hello"]
    // Do note that "hello---" still returns two parts ["hello", ""]
    // so no special treatment is necessary
    if (parts.length > 1) {
      let err = false;
      const meta_data = yaml.parse(parts[0]);
      if (typeof meta_data !== "object") {
        console.error("Expected a map as frontmatter.");
        err = true;
      }

      if ("title" in meta_data) {
        if (typeof meta_data.title !== "string") {
          console.error("Page title should be a string.");
          err = true;
        }
      }

      if ("tags" in meta_data) {
        if (!(meta_data.tags instanceof Array)) {
          console.error("Page tags should be a list.");
          err = true;
        }
      }

      if ("draft" in meta_data) {
        if (typeof meta_data.draft !== "boolean") {
          console.error("Page property 'draft' should be a boolean.");
          err = true;
        }
      }

      if (err) {
        process.error("Exited.");
        return process.exit(process.EXIT_FAILURE);
      }

      // Do not generate draft pages
      if (meta_data !== undefined && "draft" in meta_data && meta_data.draft)
        return;

      pages.push({ path: full_path, ...meta_data });
    } else {
      pages.push({ path: full_path });
    }
  });
}

function genDir(dir) {
  const ps = fs.readdirSync(dir);

  ps.forEach((page) => genFile(path.join(dir, page)));
}

async function genFile(fpath) {
  if (fs.statSync(fpath).isDirectory()) {
    return genDir(fpath);
  }

  let content = fs.readFileSync(fpath).toString();
  const parts = content.split("---");

  const meta_path = path.relative("pages", fpath);
  const meta_data = pages.find((page) => page.path === meta_path);

  if (meta_data === undefined) return;

  // Same logic as indexAllPages regarding parts.length
  const part_index = Number(parts.length > 1);
  if (parts[part_index].length > 0)
    content = await renderPage(parts[part_index], meta_data);
  else content = "";

  // Get the path without pages/ so that it can be append to public/
  const path_rel = path.join("public", path.relative("pages", fpath));
  fs.mkdirSync(path.dirname(path_rel), { recursive: true });
  fs.writeFileSync(path_rel, content);
}

async function renderPage(content, meta) {
  const renderContent = () =>
    liquid.parseAndRender(content, {
      imports: imports,
      pages: pages,
      ...meta,
    });

  if (meta.layout) {
    const new_content = await renderContent();

    const layout_name = path.join("layouts", meta.layout);
    if (!fs.existsSync(layout_name)) {
      console.error(`Layout ${meta.layout} not found.\nExiting.`);
      return process.exit(process.EXIT_FAILURE);
    }

    let layout = fs.readFileSync(layout_name).toString();
    return await liquid.parseAndRender(layout, {
      content: new_content,
      meta: meta,
      pages: pages,
      imports: imports,
    });
  } else {
    return await renderContent();
  }
}
