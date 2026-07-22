"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Problem = {
  id: string; title: string; level: string; category: string; time: string;
  prompt: string; requirements: string[]; signature: string; starter: string;
  publicTests: { label: string; code: string }[];
  hiddenTests: { label: string; code: string }[];
  hints: string[];
};

const PROBLEMS: Problem[] = [
  {
    id: "logs", title: "解析生产日志", level: "热身", category: "Parsing", time: "25 min",
    prompt: "监控服务收到多行访问日志。实现 summarize_logs：跳过格式错误的行，按 HTTP 状态码统计数量，并返回最慢的 3 个有效请求。",
    requirements: ["每行格式：timestamp method path status latency_ms", "status 必须是 100–599 的整数，latency 必须为非负数", "slowest 按 latency 降序；相同时保留原顺序", "返回 {by_status: dict, slowest: list[dict], malformed: int}"],
    signature: "summarize_logs(lines: list[str]) -> dict",
    starter: `def summarize_logs(lines: list[str]) -> dict:\n    \"\"\"Summarize valid access-log lines.\"\"\"\n    # Your code here\n    pass`,
    publicTests: [
      { label: "基本统计", code: `r = summarize_logs([\n "10:00 GET /health 200 4",\n "10:01 POST /orders 201 42",\n "10:02 GET /oops 500 31",\n])\nassert r["by_status"] == {200: 1, 201: 1, 500: 1}\nassert [x["path"] for x in r["slowest"]] == ["/orders", "/oops", "/health"]` },
      { label: "错误输入", code: `r = summarize_logs(["bad line", "10:00 GET /x 700 2", "10:01 GET /ok 200 0"])\nassert r["malformed"] == 2\nassert r["by_status"] == {200: 1}` },
    ],
    hiddenTests: [{ label: "排序稳定性与空输入", code: `assert summarize_logs([]) == {"by_status": {}, "slowest": [], "malformed": 0}\nr = summarize_logs(["t GET /a 200 5", "t GET /b 200 5", "t GET /c 200 9", "t GET /d 200 1"])\nassert [x["path"] for x in r["slowest"]] == ["/c", "/a", "/b"]` }],
    hints: ["先写一个只负责解析单行的小步骤。", "enumerate 可以帮助你显式保留输入顺序。"]
  },
  {
    id: "rate", title: "滑动窗口限流器", level: "核心", category: "State / OOP", time: "35 min",
    prompt: "实现一个进程内限流器。每个 user 独立计数；在任意 window 秒内最多允许 limit 次请求。时间戳保证非递减。",
    requirements: ["构造：RateLimiter(limit, window)", "allow(user_id, timestamp) 返回 bool", "窗口左边界不包含：timestamp - old >= window 时旧请求过期", "不要让已经过期的数据无限占用内存"],
    signature: "RateLimiter.allow(user_id: str, timestamp: float) -> bool",
    starter: `from collections import deque\n\nclass RateLimiter:\n    def __init__(self, limit: int, window: float):\n        pass\n\n    def allow(self, user_id: str, timestamp: float) -> bool:\n        pass`,
    publicTests: [
      { label: "窗口边界", code: `r = RateLimiter(2, 10)\nassert r.allow("a", 0) is True\nassert r.allow("a", 1) is True\nassert r.allow("a", 9) is False\nassert r.allow("a", 10) is True` },
      { label: "用户隔离", code: `r = RateLimiter(1, 5)\nassert r.allow("a", 1) and r.allow("b", 1)\nassert not r.allow("a", 2)\nassert r.allow("a", 6)` },
    ],
    hiddenTests: [{ label: "拒绝请求不应占配额", code: `r = RateLimiter(2, 10)\nassert r.allow("u", 0) and r.allow("u", 1)\nfor t in [2,3,4,5]: assert not r.allow("u", t)\nassert r.allow("u", 10)\nassert r.allow("u", 11)` }],
    hints: ["每个用户维护一个 deque。", "先清理左侧过期项，再判断长度。"]
  },
  {
    id: "cache", title: "带 TTL 的 LRU Cache", level: "进阶", category: "Data structure", time: "40 min",
    prompt: "实现固定容量、支持过期时间的 LRU 缓存。面试官希望看到清晰的语义，而不是只背 OrderedDict。",
    requirements: ["get(key, now) 命中返回值并更新最近使用；缺失或过期返回 None", "put(key, value, now, ttl) 写入/更新", "超过 capacity 时淘汰最久未使用的有效或过期条目", "capacity <= 0 时不存储"],
    signature: "TTLCache.get / TTLCache.put",
    starter: `from collections import OrderedDict\n\nclass TTLCache:\n    def __init__(self, capacity: int):\n        pass\n\n    def get(self, key, now: float):\n        pass\n\n    def put(self, key, value, now: float, ttl: float) -> None:\n        pass`,
    publicTests: [{ label: "LRU 淘汰", code: `c = TTLCache(2)\nc.put("a", 1, 0, 100); c.put("b", 2, 0, 100)\nassert c.get("a", 1) == 1\nc.put("c", 3, 2, 100)\nassert c.get("b", 2) is None\nassert c.get("a", 2) == 1` }, { label: "TTL", code: `c = TTLCache(1); c.put("x", 7, 5, 3)\nassert c.get("x", 7.9) == 7\nassert c.get("x", 8) is None` }],
    hiddenTests: [{ label: "更新与零容量", code: `c = TTLCache(0); c.put("x", 1, 0, 5); assert c.get("x", 0) is None\nc = TTLCache(1); c.put("x", 1, 0, 5); c.put("x", 2, 1, 10); assert c.get("x", 9) == 2` }],
    hints: ["OrderedDict.move_to_end 和 popitem(last=False) 很适合表达 LRU。", "把 expiry 明确定义为 now + ttl；now >= expiry 即过期。"]
  },
  {
    id: "retry", title: "可测试的重试器", level: "核心", category: "Reliability", time: "30 min",
    prompt: "实现 retry_call。真实代码中 sleep 和随机数会让测试变慢，因此它们必须可注入。",
    requirements: ["fn 成功时立即返回", "仅捕获 retry_on 指定的异常", "最多 attempts 次，总 attempts 必须 >= 1", "退避：base_delay * 2**retry_index，并调用注入的 sleep_fn"],
    signature: "retry_call(fn, attempts=3, base_delay=0.1, sleep_fn=..., retry_on=(Exception,))",
    starter: `import time\n\ndef retry_call(fn, attempts=3, base_delay=0.1,\n               sleep_fn=time.sleep, retry_on=(Exception,)):\n    pass`,
    publicTests: [{ label: "失败后成功", code: `calls = []; sleeps = []\ndef flaky():\n    calls.append(1)\n    if len(calls) < 3: raise ValueError("temporary")\n    return "ok"\nassert retry_call(flaky, 4, 0.5, sleeps.append, (ValueError,)) == "ok"\nassert sleeps == [0.5, 1.0]` }, { label: "不重试其他异常", code: `try:\n    retry_call(lambda: (_ for _ in ()).throw(TypeError("bad")), 3, 1, lambda _: None, (ValueError,))\n    assert False\nexcept TypeError: pass` }],
    hiddenTests: [{ label: "最后异常与参数校验", code: `n=[0]\ndef f(): n[0]+=1; raise RuntimeError("x")\ntry: retry_call(f, 2, 0, lambda _: None, (RuntimeError,))\nexcept RuntimeError: pass\nassert n[0] == 2\ntry: retry_call(lambda: 1, 0)\nexcept ValueError: pass\nelse: assert False` }],
    hints: ["第 1 次失败后 sleep base_delay，第 2 次失败后 sleep 2*base_delay。", "最后一次失败后不再 sleep。"]
  },
  {
    id: "merge", title: "合并分页 API 数据", level: "热身", category: "API / Transform", time: "25 min",
    prompt: "多个 API 页面可能重复返回同一用户，字段也可能缺失。合并并标准化数据，供下游批处理使用。",
    requirements: ["按 id 去重，后出现的非 None 字段覆盖旧值", "忽略没有 id 的记录", "输出字段固定为 id, name, email, active", "active 默认 True；结果按 id 的字符串形式排序"],
    signature: "merge_users(pages: list[list[dict]]) -> list[dict]",
    starter: `def merge_users(pages: list[list[dict]]) -> list[dict]:\n    pass`,
    publicTests: [{ label: "去重覆盖", code: `pages = [[{"id": 2, "name": "Bo"}, {"id": 1, "name": "Ada", "email": None}], [{"id": 1, "email": "a@x.com"}]]\nassert merge_users(pages) == [\n {"id": 1, "name": "Ada", "email": "a@x.com", "active": True},\n {"id": 2, "name": "Bo", "email": None, "active": True},\n]` }, { label: "忽略脏数据", code: `assert merge_users([[{"name":"ghost"}], []]) == []` }],
    hiddenTests: [{ label: "None 不覆盖与字符串排序", code: `r=merge_users([[{"id":"10","name":"x","active":False},{"id":"2","name":"y"}], [{"id":"10","name":None}]])\nassert [x["id"] for x in r] == ["10","2"]\nassert r[0]["name"] == "x" and r[0]["active"] is False` }],
    hints: ["先构建 id -> 累积记录 的字典。", "dict.get 无法区分字段缺失与显式 None；这里二者都不能覆盖。"]
  },
  {
    id: "scheduler", title: "依赖任务调度", level: "进阶", category: "Graph / Practical", time: "40 min",
    prompt: "构建系统收到 task -> prerequisites 配置。返回可执行批次；同一批中的任务可并行。若存在环或缺失依赖，抛出 ValueError。",
    requirements: ["每一批按任务名排序，保证结果稳定", "下一批只能使用之前批次已经完成的任务", "依赖中引用但未定义的任务视为配置错误", "空输入返回 []"],
    signature: "build_batches(dependencies: dict[str, list[str]]) -> list[list[str]]",
    starter: `def build_batches(dependencies: dict[str, list[str]]) -> list[list[str]]:\n    pass`,
    publicTests: [{ label: "并行批次", code: `d={"test":["build"], "deploy":["test"], "lint":[], "build":[]}\nassert build_batches(d) == [["build","lint"], ["test"], ["deploy"]]` }, { label: "检测环", code: `try: build_batches({"a":["b"],"b":["a"]})\nexcept ValueError: pass\nelse: assert False` }],
    hiddenTests: [{ label: "缺失依赖", code: `assert build_batches({}) == []\ntry: build_batches({"ship":["package"]})\nexcept ValueError: pass\nelse: assert False` }],
    hints: ["这是 Kahn 拓扑排序的批处理版本。", "每轮收集所有 remaining 中依赖已完成的任务。"]
  },
];

const WORKER = `
self.onmessage = async (event) => {
  try {
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');
    const pyodide = await loadPyodide();
    let output = '';
    pyodide.setStdout({batched: s => output += s + '\\n'});
    pyodide.setStderr({batched: s => output += s + '\\n'});
    const { code, tests } = event.data;
    await pyodide.runPythonAsync(code);
    const results = [];
    for (const test of tests) {
      try { await pyodide.runPythonAsync(test.code); results.push({label:test.label, passed:true}); }
      catch (e) { results.push({label:test.label, passed:false, error:String(e).split('\\n').slice(-2).join('\\n')}); }
    }
    self.postMessage({ok:true, output, results});
  } catch (e) { self.postMessage({ok:false, error:String(e)}); }
};`;

export default function Home() {
  const [selected, setSelected] = useState(PROBLEMS[0].id);
  const problem = useMemo(() => PROBLEMS.find(p => p.id === selected)!, [selected]);
  const [code, setCode] = useState(problem.starter);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [hint, setHint] = useState(0);
  const [solved, setSolved] = useState<string[]>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => { try { setSolved(JSON.parse(localStorage.getItem("sde-lab-solved") || "[]")); } catch {} }, []);
  const choose = (id: string) => { const p = PROBLEMS.find(x => x.id === id)!; setSelected(id); setCode(p.starter); setResult(null); setHint(0); };
  const run = () => {
    setRunning(true); setResult(null);
    workerRef.current?.terminate();
    const worker = new Worker(URL.createObjectURL(new Blob([WORKER], {type:"text/javascript"})));
    workerRef.current = worker;
    const timer = setTimeout(() => { worker.terminate(); setRunning(false); setResult({ok:false,error:"运行超过 8 秒，已停止。检查是否有死循环。"}); }, 8000);
    worker.onmessage = e => {
      clearTimeout(timer); setRunning(false); setResult(e.data); worker.terminate();
      if (e.data.ok && e.data.results.every((x:any) => x.passed)) {
        const next = Array.from(new Set([...solved, problem.id])); setSolved(next); localStorage.setItem("sde-lab-solved", JSON.stringify(next));
      }
    };
    worker.onerror = () => { clearTimeout(timer); setRunning(false); setResult({ok:false,error:"Python 引擎加载失败，请检查网络后重试。"}); worker.terminate(); };
    worker.postMessage({code, tests:[...problem.publicTests, ...problem.hiddenTests]});
  };
  const passed = result?.ok && result.results?.every((x:any)=>x.passed);

  return <main>
    <header className="topbar">
      <div className="brand"><span className="brandmark">&gt;_</span><div><b>Practical.py</b><small>SDE onsite practice lab</small></div></div>
      <div className="progress"><span>{solved.length}/{PROBLEMS.length} solved</span><div><i style={{width:`${solved.length/PROBLEMS.length*100}%`}} /></div></div>
    </header>
    <div className="workspace">
      <aside className="sidebar">
        <p className="eyebrow">PRACTICE SET · 01</p><h1>写真实的代码。<br/><em>不刷换皮题。</em></h1>
        <p className="intro">6 个限时场景，练习解析、状态、可靠性、API 与可测试设计。</p>
        <nav aria-label="练习题列表">{PROBLEMS.map((p,i)=><button key={p.id} className={p.id===selected?"active":""} onClick={()=>choose(p.id)}>
          <span className="num">{String(i+1).padStart(2,"0")}</span><span><b>{p.title}</b><small>{p.category} · {p.time}</small></span><span className={solved.includes(p.id)?"done":"dot"}>{solved.includes(p.id)?"✓":""}</span>
        </button>)}</nav>
        <div className="source-note"><b>题型依据</b><p>综合公开面经中反复出现的 rate limiter、日志/文件解析、缓存、API 转换、重试与依赖调度。</p></div>
      </aside>
      <section className="problem">
        <div className="problem-head"><div><span className="pill">{problem.level}</span><span className="category">{problem.category}</span><h2>{problem.title}</h2></div><div className="timer">建议 <b>{problem.time}</b></div></div>
        <p className="prompt">{problem.prompt}</p>
        <h3>需求</h3><ul>{problem.requirements.map(x=><li key={x}>{x}</li>)}</ul>
        <div className="signature"><span>FUNCTION</span><code>{problem.signature}</code></div>
        <h3>公开测试</h3>{problem.publicTests.map((t,i)=><div className="testcase" key={t.label}><span>TEST {i+1}</span><b>{t.label}</b></div>)}
        <button className="hint" onClick={()=>setHint(Math.min(hint+1,problem.hints.length))}>提示 {hint}/{problem.hints.length} →</button>
        {hint>0 && <div className="hintbox">{problem.hints.slice(0,hint).map((h,i)=><p key={h}><b>{i+1}.</b> {h}</p>)}</div>}
      </section>
      <section className="editor-panel">
        <div className="editor-head"><span><i/> solution.py</span><button onClick={()=>setCode(problem.starter)}>重置</button></div>
        <div className="editor-wrap"><div className="lines" aria-hidden="true">{code.split("\n").map((_,i)=><span key={i}>{i+1}</span>)}</div><textarea spellCheck={false} aria-label="Python 代码编辑器" value={code} onChange={e=>setCode(e.target.value)} /></div>
        <div className="runbar"><span>Python 3 · Pyodide</span><button onClick={run} disabled={running}>{running?<><i className="spinner"/> 加载 / 运行</>:<>▶ Run tests</>}</button></div>
        <div className={`console ${passed?"success":""}`}>
          <div className="console-title"><span>TEST OUTPUT</span>{result && <b>{passed?"ALL PASSED":"NEEDS WORK"}</b>}</div>
          {!result && !running && <p className="muted">运行代码后，这里会显示公开与隐藏测试结果。</p>}
          {running && <p className="muted">首次加载 Python 约需几秒…</p>}
          {result?.error && <pre>{result.error}</pre>}
          {result?.output && <pre>{result.output}</pre>}
          {result?.results?.map((r:any)=><div className={r.passed?"test-pass":"test-fail"} key={r.label}><span>{r.passed?"✓":"×"}</span><div><b>{r.label}</b>{r.error&&<pre>{r.error}</pre>}</div></div>)}
        </div>
      </section>
    </div>
  </main>;
}
