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
    "Core stack",
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

test("places the typing animation directly above the profile badges", () => {
  const typingIndex = readme.indexOf("readme-typing-svg.demolab.com");
  const followersIndex = readme.indexOf("img.shields.io/github/followers");

  assert.ok(typingIndex >= 0);
  assert.ok(typingIndex < followersIndex);
});

test("puts the greeting before the profile card", () => {
  const greetingIndex = readme.indexOf("# Hi, I'm Twot Nguyen 👋");
  const profileCardIndex = readme.indexOf("<picture>");

  assert.ok(greetingIndex >= 0);
  assert.ok(greetingIndex < profileCardIndex);
});

test("centers branded contact badges and includes every social link", () => {
  const connect = readme.match(
    /<div align="center">\s+## 🤝 Connect([\s\S]+?)<\/div>\s+## 🐍 Contributions/,
  );
  assert.ok(connect);

  for (const expected of [
    "logo=gmail",
    "logo=github",
    "logo=facebook",
    "logo=instagram",
    "logo=x",
    "logo=linkedin",
    "logo=zalo",
    "https://x.com/TwotNguyen",
    "https://www.linkedin.com/in/nguy%E1%BB%85n-ng%E1%BB%8Dc-t%C3%ACnh-259208420/",
    "https://zalo.me/0369861439",
  ]) {
    assert.ok(connect[1].includes(expected), `missing ${expected}`);
  }
});

test("removes redundant and project content", () => {
  for (const removed of [
    "Featured Projects",
    "Top Langs",
    "Activity Graph",
    "antigravity-cockpit",
    "Current focus",
    "What I work with",
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
