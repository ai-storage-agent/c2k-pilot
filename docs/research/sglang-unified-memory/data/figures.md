# 原文图表索引

> LMSYS Org blog, *Unified Memory in SGLang: One Arena for Every Token Lifetime*（2026-11-11）。
> 来源站点：`https://www.lmsys.org/images/blog/unified-memory/`。全部 SVG 于 2026-11-12 抓取核验（HTTP 200）。
> 图注全文取自各 SVG 的 `aria-label` 属性（无障碍描述，与正文图注互为印证）。

| 图 | 文件 | 尺寸 | 抓取 | 主题 |
| --- | --- | --- | --- | --- |
| Figure 1 | `fig1-separate-pools.svg` | 880×436 | 200，7,982 B | 两个固定池、中间一堵墙；两种负载把空闲单元搁浅在相反方向 |
| Figure 2 | `fig2-one-arena.svg` | 880×436 | 200，6,064 B | 同一字节尺度的单 arena；活数据向两端压实，中间是未划分的字节区 |
| Figure 3 | `fig3-token-entries.svg` | 900×316 | 200，6,367 B | token-major entry 与跨步 lane 视图；target 与 draft 行可不同尺寸 |
| Figure 4 | `fig4-planner.svg` | 900×626 | 200，15,562 B | 三级重排阶梯：no move → compact ends → relayout |
| Figure 5 | `fig5-page-states.svg` | 880×788 | 200，7,215 B | 页状态机（beyond frontier / hole / live / pending）与两种源保护 |
| Figure 6 | `fig6-architecture.svg` | 900×500 | 200，8,680 B | 一个 arena + 三个接口（声明、容量询问、页使用 ledger） |

## Figure 1 — `fig1-separate-pools.svg`

**aria-label 全文：** Schematic of two fixed pools on one byte scale, bounded state on the low bytes with large units and full-attention KV on the high bytes with smaller units, separated by a fixed wall. Live units are scattered through each pool. Under a long-context workload the full-attention pool has no free unit while four of six bounded-state units are free and stranded. Under many short requests the bounded pool has no free unit while seventeen of twenty-four full-attention units are free and stranded. Free units on one side cannot serve the other side.

**要点：** 注意两个场景的数字刻意不对称（4/6 与 17/24），说明"搁浅"的比例取决于负载形态与 unit 尺寸；原文正文对应"a long-context workload can exhaust the full-attention pool while much of the pool for the bounded states sits idle, and many short requests do the reverse"。

## Figure 2 — `fig2-one-arena.svg`

**aria-label 全文：** Schematic of one arena on the same byte scale as Figure 1. Live bounded-state units, which are large, are compacted toward the low end and live full-attention KV units, which are smaller, toward the high end; the free space between them is one undivided region of bytes with no page grid. Under a long-context workload full KV can grow down into it; under many short requests bounded state can grow up into it, each in its own unit size.

**要点：** 与 Figure 1 使用**同一字节尺度**是这张图的关键——它证明"消灭的是墙而不是数据"。

## Figure 3 — `fig3-token-entries.svg`

**aria-label 全文：** Token-major entries and strided per-lane views. Bottom: one physical page of consecutive token entries, all the same size. Each entry holds two target layers, L0 and L1, and two speculative-draft lanes, draft 0 and draft 1, in the same order; the draft rows are drawn narrower than the target rows to show that the two can differ in size. Top: the target layer 0 view and the draft lane 0 view, each a token-by-payload tensor; every cell is joined by a vertical line to its lane in the entry for the same token, so consecutive cells of a view are one whole entry apart in memory (stride). Because rows of different sizes share one entry, target and draft use the same token id, and one allocation, free or whole-page move carries both.

**要点：** "one whole entry apart (stride)"是这篇博客里对"为什么每层视图是跨步的"最清楚的表述；`[文档]` 的 backend allow-list 正是为"支持 strided view 的后端"设的。

## Figure 4 — `fig4-planner.svg`

**aria-label 全文：** Three arena layouts on one byte scale; each sub-pool has its own unit width: state slots are widest, window pages are narrower, and full-attention pages are narrowest. The request needs four full-attention pages. With no move, the full-attention band has three one-page holes, which is one page short, and the window band has an interior hole that it cannot give to full attention. Compacting only the two ends turns the three holes into three free pages beside the window band and still falls one short. Relocating copies the rightmost window page into the window's interior hole; the page it vacates joins the gap, so there is room for five full-attention pages beside the full band. Allocating the request then uses four of them and leaves one free.

**要点：** 三级阶梯不是"越强越好"，而是**按需升级**：no move 失败才 compact ends，仍失败才 relayout。原文正文强调 "The ladder uses only as much movement as the demand needs。"

## Figure 5 — `fig5-page-states.svg`

**aria-label 全文：** State transitions for unified memory. Beyond frontier grows into Live. Hole allocates to Live. Live frees straight to Hole when nothing is in flight, or to Pending when a forward may read or write it; Pending becomes Hole after the forward is processed or settled. Below, moving a page copies and remaps it into a Live destination whose new readers follow the copy; the destination never enters source protection. Two dashed source-side protections hang off the Live source. Vacated: the source stays in band and old readers may still read it; after readers finish it becomes a Hole. Fenced: an old reader continues and the frontier retreats beyond the source; the next writer waits for the fence. Vacated and Fenced are source protections, not ordinary allocation states. Fenced bytes become Live again once the next writer has waited for the fence. A hole at the edge of a band can leave the band again when the frontier retreats over it, returning to Beyond frontier.

**要点：** "the destination never enters source protection"是最容易误读的一句——保护只挂在源侧；这条与正文"The old source remains protected against premature reuse"一致。

## Figure 6 — `fig6-architecture.svg`

**aria-label 全文：** One arena at the centre of three interfaces. First, models declare their state parts, each saying what it stores and how long it lives, and one storage plan builds the arena from them. Second, prefill admission, decode headroom, HiCache load-back, PD preallocation and prefix-cache eviction all ask one allocator whether a whole demand fits; the allocator searches for a layout if needed, then hands out and moves the arena's pages. Third, a page-use ledger under the arena records who still touches each page. Forwards, host copies, network transfers and page moves use pages through it.

**要点：** 三个接口是本篇最可迁移的设计（见 [02 §1](02-recommendations.md)）。图注明确把"capacity questions"的五个来源一次列全，可作为我们自查"哪些路径还在读单池余量"的清单。

## 抓取命令（可复现）

```bash
for f in fig1-separate-pools fig2-one-arena fig3-token-entries \
         fig4-planner fig5-page-states fig6-architecture; do
  curl -sS -o "/tmp/$f.svg" -w "$f %{http_code} %{size_download}\n" \
    "https://www.lmsys.org/images/blog/unified-memory/$f.svg"
done
```
