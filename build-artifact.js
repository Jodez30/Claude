/**
 * Produces artifact.html from index.html.
 *
 * index.html is a complete standalone document so it can be served directly by
 * GitHub Pages. The Claude Artifact host supplies its own <!doctype>/<head>/<body>
 * skeleton, so it needs the same page as a fragment. Rather than maintain two
 * copies, this lifts everything between the ARTIFACT markers and drops the
 * head/body seam.
 *
 *   node build-artifact.js
 */
const fs = require("fs");

const src = fs.readFileSync("index.html", "utf8");
const m = src.match(/<!--ARTIFACT:START-->([\s\S]*?)<!--ARTIFACT:END-->/);
if (!m) throw new Error("ARTIFACT markers not found in index.html");

const fragment = m[1]
  .replace(/^\s*<\/head>\s*<body>\s*$/m, "")   // the seam only the standalone doc needs
  .trim() + "\n";

for (const tag of ["<!doctype", "<html", "</html>", "<head>", "</head>", "<body>", "</body>"]) {
  if (fragment.toLowerCase().includes(tag)) throw new Error(`fragment still contains ${tag}`);
}
if (!fragment.includes("<title>")) throw new Error("fragment lost its <title>");

fs.writeFileSync("artifact.html", fragment);
console.log(`artifact.html written — ${(fragment.length / 1024).toFixed(1)} KB`);
