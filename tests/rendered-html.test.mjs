import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", {headers:{accept:"text/html"}}), {ASSETS:{fetch:async()=>new Response("Not found",{status:404})}}, {waitUntil(){},passThroughOnException(){}});
}

test("renders the Practical.py application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Practical\.py/);
  assert.match(html, /SDE onsite practice lab/);
  assert.match(html, /解析生产日志/);
  assert.match(html, /Run tests/);
  assert.match(html, /Switch to English/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("ships a complete practical interview set", async () => {
  const response = await render();
  const html = await response.text();
  for (const title of ["滑动窗口限流器","带 TTL 的 LRU Cache","可测试的重试器","合并分页 API 数据","依赖任务调度"]) assert.match(html, new RegExp(title));
  for (const title of ["Meeting 时长 Top K","过去 7 天未处理记录","安全拉取分页 API","API 429 与重试策略","Webhook 事件去重","合并两个用户 API","图片大小统计","流式状态聚合"]) assert.match(html, new RegExp(title));
  assert.match(html, /14 个限时场景/);
  assert.match(html, /公开测试 · 可展开查看/);
  assert.match(html, /TEST OUTPUT/);
  assert.match(html, /Python 3/);
});

test("includes English translations for the complete practice set", async () => {
  const source = await readFile(new URL("../app/i18n.ts", import.meta.url), "utf8");
  for (const title of [
    "Production Log Parser",
    "Sliding-Window Rate Limiter",
    "TTL-Aware LRU Cache",
    "Top Meeting Participants",
    "Safe Paginated API Fetch",
    "Streaming Status Aggregation",
  ]) assert.match(source, new RegExp(title));
});

test("persists drafts and passing solutions per problem", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /sde-lab-draft:/);
  assert.match(page, /sde-lab-passed:/);
  assert.match(page, /localStorage\.setItem\(passedKey\(problem\.id\), code\)/);

  const response = await render();
  const html = await response.text();
  assert.match(html, /恢复通过版本/);
  assert.match(html, /重置为初始代码/);
});
