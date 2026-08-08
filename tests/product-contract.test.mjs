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
  assert.equal(pkg.scripts.build, "vite build");
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

test("keeps public privacy claims aligned with the local-first implementation", async () => {
  const files = await Promise.all([
    read("../README.md"),
    read("../app/components/TrustSections.tsx"),
    read("../app/components/CredibilitySections.tsx"),
    read("../app/components/LandingPage.tsx"),
  ]);
  const source = files.join("\n");

  assert.match(source, /原始摄像头帧.*不上传/);
  assert.match(source, /VITE_API_BASE/);
  assert.match(source, /结构化.*模型服务/);
  assert.doesNotMatch(source, /所有体态视频.*加密存储于我们的云端服务器/);
  assert.doesNotMatch(source, /普遍反馈/);
  assert.doesNotMatch(source, /云端引擎依据新数据微调/);
});
