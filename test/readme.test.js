const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const readme = fs.readFileSync("README.md", "utf8");
const template = fs.readFileSync("template.md", "utf8");

test("keeps the profile README concise", () => {
  assert.ok(readme.split("\n").length <= 70);
});

test("uses the approved sections", () => {
  for (const heading of [
    "What I work with",
    "Current focus",
    "Connect",
    "Contributions",
    "Quote of the Day",
  ]) {
    assert.match(readme, new RegExp(`## .*${heading}`, "i"));
  }

  assert.match(readme, /github-contribution-grid-snake-dark\.svg/);
});

test("shows followers, stars, and profile views in the hero", () => {
  assert.match(readme, /img\.shields\.io\/github\/followers\/twotnguyen/);
  assert.match(readme, /img\.shields\.io\/github\/stars\/twotnguyen/);
  assert.match(readme, /komarev\.com\/ghpvc\/\?username=twotnguyen/);
});

test("puts the greeting before the profile card", () => {
  const greetingIndex = readme.indexOf("# Hi, I'm Twot Nguyen 👋");
  const profileCardIndex = readme.indexOf("<picture>");

  assert.ok(greetingIndex >= 0);
  assert.ok(greetingIndex < profileCardIndex);
});

test("removes redundant and project content", () => {
  for (const removed of [
    "Featured Projects",
    "Typing SVG",
    "Top Langs",
    "Activity Graph",
    "antigravity-cockpit",
  ]) {
    assert.doesNotMatch(readme, new RegExp(removed, "i"));
  }
});

test("ends with the daily quote and decorative wave", () => {
  assert.match(template, /\{QUOTE_HERE\}/);
  assert.match(readme, /quote\.svg\?v=\d+/);
  assert.match(readme, /capsule-render\.vercel\.app\/api\?type=waving/);

  const closingContent = readme.match(/<div align="center">([\s\S]+)<\/div>\s*$/);
  assert.ok(closingContent);
  assert.match(closingContent[1], /Quote of the Day[\s\S]+capsule-render/);
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
