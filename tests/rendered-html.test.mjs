import assert from "node:assert/strict";
import test from "node:test";

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
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("ships a complete practical interview set", async () => {
  const response = await render();
  const html = await response.text();
  for (const title of ["滑动窗口限流器","带 TTL 的 LRU Cache","可测试的重试器","合并分页 API 数据","依赖任务调度"]) assert.match(html, new RegExp(title));
  assert.match(html, /TEST OUTPUT/);
  assert.match(html, /Python 3/);
});
