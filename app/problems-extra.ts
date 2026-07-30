export const EXTRA_PROBLEMS = [
  {
    id: "meetings", title: "Meeting 时长 Top K", level: "核心", category: "Datetime / Aggregate", time: "35 min",
    prompt: "给定多场会议记录，按 participant 汇总有效会议时长并返回前 K 名。每位 participant 都累计整场会议时长。",
    requirements: [
      "字段：meeting_id, participants, started_at, ended_at；缺少任一必需字段则忽略",
      "时间为 ISO 8601，支持 Z 和带 offset 的时间；结束时间不得早于开始时间",
      "meeting_id 重复时只处理第一次；participants 内部重复用户只计算一次",
      "返回 [{user_id, total_minutes}]；按时长降序，相同时按 str(user_id) 升序；最多 top_k 条",
    ],
    signature: "top_participants(meetings: list[dict], top_k: int = 3) -> list[dict]",
    starter: `from datetime import datetime

def top_participants(meetings: list[dict], top_k: int = 3) -> list[dict]:
    pass`,
    publicTests: [
      { label: "聚合与排序", code: `meetings = [
 {"meeting_id":"m1","participants":["u1","u2"],"started_at":"2026-07-01T10:00:00Z","ended_at":"2026-07-01T10:30:00Z"},
 {"meeting_id":"m2","participants":["u1"],"started_at":"2026-07-01T12:00:00+00:00","ended_at":"2026-07-01T13:00:00+00:00"},
]
assert top_participants(meetings) == [
 {"user_id":"u1","total_minutes":90.0},
 {"user_id":"u2","total_minutes":30.0},
]` },
      { label: "重复与无效记录", code: `meetings = [
 {"meeting_id":"m1","participants":["u1","u1"],"started_at":"2026-01-01T00:00:00Z","ended_at":"2026-01-01T00:10:00Z"},
 {"meeting_id":"m1","participants":["u2"],"started_at":"2026-01-01T00:00:00Z","ended_at":"2026-01-01T01:00:00Z"},
 {"meeting_id":"bad","participants":["u3"],"started_at":"not-a-date","ended_at":"2026-01-01T01:00:00Z"},
]
assert top_participants(meetings) == [{"user_id":"u1","total_minutes":10.0}]` },
    ],
    hiddenTests: [{ label: "Top K、平局与空输入", code: `assert top_participants([], 3) == []
r=top_participants([
 {"meeting_id":"a","participants":[2],"started_at":"2026-01-01T00:00:00Z","ended_at":"2026-01-01T00:05:00Z"},
 {"meeting_id":"b","participants":[1],"started_at":"2026-01-01T00:00:00Z","ended_at":"2026-01-01T00:05:00Z"},
],1)
assert r == [{"user_id":1,"total_minutes":5.0}]` }],
    hints: ["先写 parse_iso(text)，将末尾 Z 替换成 +00:00 后使用 datetime.fromisoformat。", "用 seen_meetings 去重会议，用 set(participants) 去重单场参与者。"],
  },
  {
    id: "recent", title: "过去 7 天未处理记录", level: "核心", category: "Datetime / Filter", time: "30 min",
    prompt: "找出最近 days 天创建、但尚未处理的记录。所有比较以传入 now 的绝对时间为准。",
    requirements: [
      "字段：id, created_at, processed_at；created_at 缺失或无效时忽略",
      "processed_at 缺失或为 None 表示未处理；其他值均视为已处理",
      "窗口包含左边界：[now - days, now]；未来记录不返回",
      "返回原记录的浅拷贝，按实际创建时间升序；空输入返回 []",
    ],
    signature: "find_unprocessed(records: list[dict], now: str, days: int = 7) -> list[dict]",
    starter: `from datetime import datetime, timedelta

def find_unprocessed(records: list[dict], now: str, days: int = 7) -> list[dict]:
    pass`,
    publicTests: [
      { label: "窗口与时区", code: `records=[
 {"id":1,"created_at":"2026-07-23T12:00:00Z","processed_at":None},
 {"id":2,"created_at":"2026-07-22T12:00:00+00:00"},
 {"id":3,"created_at":"2026-07-24T00:00:01Z","processed_at":None},
 {"id":4,"created_at":"2026-07-23T13:00:00Z","processed_at":"done"},
]
assert [x["id"] for x in find_unprocessed(records,"2026-07-24T00:00:00Z",1)] == [1]` },
      { label: "包含左边界", code: `r=[{"id":"edge","created_at":"2026-07-01T00:00:00Z"}]
assert [x["id"] for x in find_unprocessed(r,"2026-07-08T00:00:00Z",7)] == ["edge"]` },
    ],
    hiddenTests: [{ label: "无效日期与空输入", code: `assert find_unprocessed([],"2026-01-01T00:00:00Z") == []
assert find_unprocessed([{"id":1,"created_at":"bad"}],"2026-01-01T00:00:00Z") == []` }],
    hints: ["解析 now 一次，再计算 lower = now_dt - timedelta(days=days)。", "不要比较 ISO 字符串本身；先解析成 datetime。"],
  },
  {
    id: "pagination", title: "安全拉取分页 API", level: "核心", category: "API / Pagination", time: "35 min",
    prompt: "实现与 HTTP 库解耦的分页读取器。fetch_page(cursor) 返回一页 JSON 字典；第一页 cursor 为 None。",
    requirements: [
      "页结构：{items: list, next_cursor: str | None}；items 缺失或为 None 时按空列表处理",
      "按 item.id 去重，保留第一次；没有 id 的 item 忽略",
      "next_cursor 为 None 时结束；cursor 重复出现时抛出 ValueError('cursor cycle')",
      "返回所有唯一 item，保持首次出现顺序；不得提前假设页数",
    ],
    signature: "fetch_all(fetch_page) -> list[dict]",
    starter: `def fetch_all(fetch_page) -> list[dict]:
    pass`,
    publicTests: [
      { label: "分页与去重", code: `pages={
 None:{"items":[{"id":1},{"id":2}],"next_cursor":"p2"},
 "p2":{"items":[{"id":2},{"id":3},{"name":"missing"}],"next_cursor":None},
}
calls=[]
def fetch(cursor):
    calls.append(cursor)
    return pages[cursor]
assert fetch_all(fetch) == [{"id":1},{"id":2},{"id":3}]
assert calls == [None,"p2"]` },
      { label: "缺失 items", code: `assert fetch_all(lambda cursor: {"next_cursor":None}) == []` },
    ],
    hiddenTests: [{ label: "Cursor 循环", code: `pages={None:{"items":[],"next_cursor":"x"},"x":{"items":[],"next_cursor":"x"}}
try: fetch_all(lambda c: pages[c])
except ValueError as e: assert str(e) == "cursor cycle"
else: assert False` }],
    hints: ["分别维护 seen_ids 和 seen_cursors。", "第一次调用 fetch_page(None)，处理完当前页后再更新 cursor。"],
  },
  {
    id: "http_retry", title: "API 429 与重试策略", level: "进阶", category: "API / Reliability", time: "40 min",
    prompt: "实现可测试的 API 请求重试。request_fn() 返回模拟响应字典，或抛出 TimeoutError；不依赖第三方库。",
    requirements: [
      "响应：{status: int, json: any, headers?: dict}；200–299 立即返回 json",
      "429 可重试：有 Retry-After 则 sleep 其 float 值，否则指数退避",
      "500–599 和 TimeoutError 可重试；其他状态立即抛 ValueError('non-retryable status: X')",
      "attempts < 1 抛 ValueError；最后仍失败时抛最后的 TimeoutError 或 ValueError('request failed: X')",
    ],
    signature: "fetch_with_retry(request_fn, attempts=3, base_delay=0.1, sleep_fn=...)",
    starter: `import time

def fetch_with_retry(request_fn, attempts=3, base_delay=0.1,
                     sleep_fn=time.sleep):
    pass`,
    publicTests: [
      { label: "429 后成功", code: `responses=iter([
 {"status":429,"headers":{"Retry-After":"2"}},
 {"status":200,"json":{"ok":True}},
])
sleeps=[]
assert fetch_with_retry(lambda:next(responses),3,0.1,sleeps.append) == {"ok":True}
assert sleeps == [2.0]` },
      { label: "5xx 指数退避", code: `responses=iter([{"status":500},{"status":503},{"status":204,"json":None}])
sleeps=[]
assert fetch_with_retry(lambda:next(responses),3,0.5,sleeps.append) is None
assert sleeps == [0.5,1.0]` },
    ],
    hiddenTests: [{ label: "参数、4xx 与最终失败", code: `try: fetch_with_retry(lambda:{"status":200},0)
except ValueError: pass
else: assert False
try: fetch_with_retry(lambda:{"status":404},3,0,lambda _:None)
except ValueError as e: assert str(e) == "non-retryable status: 404"
else: assert False` }],
    hints: ["把一次循环视为一次 attempt；最后一次失败后不要 sleep。", "TimeoutError 用 except 捕获；HTTP 状态在返回字典中判断。"],
  },
  {
    id: "webhooks", title: "Webhook 事件去重", level: "核心", category: "Dedup / Datetime", time: "30 min",
    prompt: "Webhook 可能重复投递同一 event_id。保留 created_at 最新的版本，并输出稳定事件序列。",
    requirements: [
      "字段：event_id, created_at, payload；缺少 event_id 或 created_at、或日期无效时忽略",
      "同一 event_id 保留实际时间较新的记录；时间相同则保留后出现的记录",
      "返回记录的浅拷贝，按 created_at 实际时间升序",
      "支持 Z 与 timezone offset；空输入返回 []",
    ],
    signature: "dedupe_events(events: list[dict]) -> list[dict]",
    starter: `from datetime import datetime

def dedupe_events(events: list[dict]) -> list[dict]:
    pass`,
    publicTests: [
      { label: "保留最新版本", code: `events=[
 {"event_id":"e1","created_at":"2026-01-01T10:00:00Z","payload":{"v":1}},
 {"event_id":"e2","created_at":"2026-01-01T09:00:00Z","payload":{"v":1}},
 {"event_id":"e1","created_at":"2026-01-01T11:00:00+00:00","payload":{"v":2}},
]
r=dedupe_events(events)
assert [x["event_id"] for x in r] == ["e2","e1"]
assert r[1]["payload"]["v"] == 2` },
      { label: "忽略无效事件", code: `assert dedupe_events([{"created_at":"2026-01-01T00:00:00Z"},{"event_id":"x","created_at":"bad"}]) == []` },
    ],
    hiddenTests: [{ label: "相同时间后者胜出", code: `r=dedupe_events([
 {"event_id":"x","created_at":"2026-01-01T00:00:00Z","payload":1},
 {"event_id":"x","created_at":"2025-12-31T19:00:00-05:00","payload":2},
])
assert len(r)==1 and r[0]["payload"]==2` }],
    hints: ["哈希表保存 event_id -> (parsed_datetime, record)。", "使用 >= 可让相同绝对时间的后出现记录覆盖前者。"],
  },
  {
    id: "profiles", title: "合并两个用户 API", level: "核心", category: "API / Join", time: "35 min",
    prompt: "把账户 API 和会议 API 的用户资料按 email 合并。email 比较忽略大小写和首尾空格，账户 API 的非 None 字段优先。",
    requirements: [
      "字段可能为 email, name, company, meeting_count；email 缺失、None 或空白时忽略",
      "输出固定字段：email, name, company, meeting_count；email 使用第一次出现时的原始写法",
      "先合并 meeting_users，后用 account_users 的非 None 字段覆盖；同一来源后出现的非 None 值覆盖",
      "未匹配用户也保留；缺失字段默认 None；按规范化 email 升序",
    ],
    signature: "merge_profiles(account_users: list[dict], meeting_users: list[dict]) -> list[dict]",
    starter: `def merge_profiles(account_users: list[dict],
                   meeting_users: list[dict]) -> list[dict]:
    pass`,
    publicTests: [
      { label: "跨 API 合并", code: `accounts=[{"email":" Ada@X.com ","name":"Ada","company":"Open"}]
meetings=[{"email":"ada@x.COM","name":"Old","meeting_count":5},{"email":"bo@x.com","name":"Bo","meeting_count":2}]
assert merge_profiles(accounts,meetings) == [
 {"email":"ada@x.COM","name":"Ada","company":"Open","meeting_count":5},
 {"email":"bo@x.com","name":"Bo","company":None,"meeting_count":2},
]` },
      { label: "忽略空 email", code: `assert merge_profiles([{"email":" "},{"name":"x"}],[]) == []` },
    ],
    hiddenTests: [{ label: "None 不覆盖", code: `r=merge_profiles([{"email":"a@x","name":None,"company":"C"}],[{"email":"A@X","name":"N","meeting_count":1}])
assert r == [{"email":"A@X","name":"N","company":"C","meeting_count":1}]` }],
    hints: ["规范化函数：str(email).strip().lower()。", "先合并 meeting_users，再合并 account_users；只让非 None 字段覆盖。"],
  },
  {
    id: "images", title: "图片大小统计", level: "热身", category: "Nested JSON", time: "25 min",
    prompt: "页面的 images 字段可能嵌套多张图片。按 image id 去重并计算有效图片大小统计。",
    requirements: [
      "每页可能为 {title, images: list[dict]}；images 缺失或 None 按空列表处理",
      "有效图片必须有 id，且 size_bytes 是 int/float（bool 不算）、并且 >= 0",
      "相同 image id 只统计第一次有效记录",
      "返回 {count, total_bytes, average_bytes}；无有效图片时 average_bytes 为 None",
    ],
    signature: "image_size_stats(pages: list[dict]) -> dict",
    starter: `def image_size_stats(pages: list[dict]) -> dict:
    pass`,
    publicTests: [
      { label: "嵌套、去重与平均值", code: `pages=[
 {"title":"A","images":[{"id":"i1","size_bytes":100},{"id":"i2","size_bytes":300}]},
 {"title":"B","images":[{"id":"i1","size_bytes":999},{"id":"i3","size_bytes":200}]},
]
assert image_size_stats(pages) == {"count":3,"total_bytes":600,"average_bytes":200.0}` },
      { label: "空结果", code: `assert image_size_stats([{"images":None},{"title":"x"}]) == {"count":0,"total_bytes":0,"average_bytes":None}` },
    ],
    hiddenTests: [{ label: "无效类型", code: `r=image_size_stats([{"images":[
 {"id":"a","size_bytes":True},{"id":"b","size_bytes":-1},{"id":"c","size_bytes":"5"},{"size_bytes":5},{"id":"d","size_bytes":0}
]}])
assert r == {"count":1,"total_bytes":0,"average_bytes":0.0}` }],
    hints: ["isinstance(True, int) 为 True，因此要显式排除 bool。", "只有通过全部校验后才把 id 加入 seen。"],
  },
  {
    id: "stream", title: "流式状态聚合", level: "进阶", category: "Iterable / Memory", time: "35 min",
    prompt: "处理可能来自文件或 generator 的记录流：按 status 聚合数量，同时只保留最近 5 条 error 记录。",
    requirements: [
      "输入是 Iterable[dict]，只能单遍消费；不得调用 len、索引或转换为 list",
      "缺少 status 的记录计入 malformed；其他记录按原 status 值计数",
      "status == 'error' 时保存记录浅拷贝；只保留输入顺序中的最后 5 条",
      "返回 {by_status, recent_errors, malformed}；空流返回空统计",
    ],
    signature: "summarize_stream(records: Iterable[dict]) -> dict",
    starter: `from collections.abc import Iterable
from collections import deque

def summarize_stream(records: Iterable[dict]) -> dict:
    pass`,
    publicTests: [
      { label: "Generator 单遍聚合", code: `def records():
    yield {"id":1,"status":"ok"}
    yield {"id":2,"status":"error"}
    yield {"id":3}
r=summarize_stream(records())
assert r == {"by_status":{"ok":1,"error":1},"recent_errors":[{"id":2,"status":"error"}],"malformed":1}` },
      { label: "只保留最近五条", code: `r=summarize_stream(({"id":i,"status":"error"} for i in range(7)))
assert [x["id"] for x in r["recent_errors"]] == [2,3,4,5,6]` },
    ],
    hiddenTests: [{ label: "拒绝重复遍历", code: `class SinglePass:
    def __init__(self): self.used=False
    def __iter__(self):
        if self.used: raise RuntimeError("iterated twice")
        self.used=True
        yield {"status":"ok"}
assert summarize_stream(SinglePass())["by_status"] == {"ok":1}` }],
    hints: ["deque(maxlen=5) 会自动丢弃最旧元素。", "最终把 deque 转为 list；不要对 records 做预扫描。"],
  },
];
