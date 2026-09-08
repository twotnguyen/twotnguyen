const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const readme = fs.readFileSync("README.md", "utf8");
const template = fs.readFileSync("template.md", "utf8");

test("keeps the profile README concise", () => {
  assert.ok(readme.split("\n").length <= 60);
});

test("uses the approved sections", () => {
  for (const heading of ["What I work with", "Current focus", "Connect", "Contributions"]) {
    assert.match(readme, new RegExp(`## .*${heading}`, "i"));
  }

  assert.match(readme, /github-contribution-grid-snake-dark\.svg/);
});

test("removes redundant and project content", () => {
  for (const removed of [
    "Featured Projects",
    "Typing SVG",
    "Top Langs",
    "Activity Graph",
    "Quote of the Day",
    "antigravity-cockpit",
  ]) {
    assert.doesNotMatch(readme, new RegExp(removed, "i"));
  }
});

test("cache-busts every generated profile image", () => {
  assert.match(template, /profile_dark\.svg\?v=\{CACHE_BUSTER\}/);
  assert.match(template, /profile_light\.svg\?v=\{CACHE_BUSTER\}/);

  const profileReferences = readme.match(/profile_(?:dark|light)\.svg\?v=\d+/g) || [];
  assert.equal(profileReferences.length, 3);
});

test("gives every HTML image useful alternative text", () => {
  const images = [...readme.matchAll(/<img\b[^>]*>/g)].map(([image]) => image);
  assert.ok(images.length > 0);
  for (const image of images) {
    assert.match(image, /\balt="[^"]+"/);
  }
});
