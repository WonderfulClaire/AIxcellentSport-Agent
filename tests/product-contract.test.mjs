import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("keeps the AI movement coach product contract", async () => {
  const [page, layout, packageJson] = await Promise.all([
    read("../app/page.tsx"),
    read("../app/layout.tsx"),
    read("../package.json"),
  ]);

  assert.match(layout, /AIxcellentSport/);
  assert.match(page, /PoseLandmarker/);
  assert.match(page, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(page, /深蹲/);
  assert.match(page, /俯卧撑/);
  assert.match(page, /开合跳/);
  assert.match(page, /本地|设备|浏览器/);

  const pkg = JSON.parse(packageJson);
  assert.ok(pkg.dependencies["@mediapipe/tasks-vision"]);
  assert.equal(pkg.scripts.build, "vinext build");
});

test("contains no starter placeholder copy", async () => {
  const files = await Promise.all([
    read("../app/page.tsx"),
    read("../app/layout.tsx"),
    read("../README.md"),
  ]);
  const source = files.join("\n");
  assert.doesNotMatch(source, /Your site is taking shape|Building your site/);
});
