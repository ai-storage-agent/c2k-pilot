# 06b · 参考文献与核验记录

> 本页是整个调研的引用索引。**所有论文引用均通过 arXiv API `id_list` 逐一核验**（标题 + 首次提交日期）；GitHub 事实通过 `gh` 获取。
> 核验时间：2026-11-04（UTC）。核验脚本与原始数据已随本目录的 `data/` 打包（见 §9.1）。

## 1. 核验方法

| 步骤 | 做法 |
| --- | --- |
| 语料构建 | 40 组 arXiv 检索式 + 经典文献补充 → 1,101 篇去重论文（`data/arxiv_corpus.json.gz`） |
| 锚点核验 | 50 篇候选锚点论文通过 `id_list` 批量核验，50/50 解析成功 |
| 二次核验 | 10 篇 2026 关键论文单独复核，10/10 成功 |
| 子领域核验 | 四个子领域（RSI 基础/harness/训练时/安全评估）分别对本页引用做 `id_list` 复核 |
| GitHub | `gh search repos`（15 组检索，155 个去重仓库）+ `gh repo view`/`gh api` 逐库核验 |

**核验原则：** 未通过 API 解析的 ID 一律不写入正文；无法核验的主张标注 `UNVERIFIED`，本页不存在此类条目。

## 2. 核心综述与形式化基础

| ID | 标题 | 日期 |
| --- | --- | --- |
| <a id="ref-2606-20683"></a>[2606.20683](https://arxiv.org/abs/2606.20683) | From Question Answering to Task Completion: A Survey on Agent System and Harness Design | 2026-06-14 |
| <a id="ref-2610-35193"></a>[2610.35193](https://arxiv.org/abs/2610.35193) | Trustworthy Recursive Self-Improvement in the Era of Large Models: Foundation, Risks, Evaluation and Open Challenges | 2026-10-26 |
| <a id="ref-2610-21646"></a>[2610.21646](https://arxiv.org/abs/2610.21646) | The Self-Improvement Problem | 2026-10-15 |
| <a id="ref-2610-27610"></a>[2610.27610](https://arxiv.org/abs/2610.27610) | Auditing the Product, Not the Recursion: The Evaluation Evidence Behind Recursive Self-Improvement Claims | 2026-10-20 |
| <a id="ref-2607-13104"></a>[2607.13104](https://arxiv.org/abs/2607.13104) | Self-Improvements in Modern Agentic Systems: A Survey | 2026-07-14 |
| <a id="ref-2609-01679"></a>[2609.01679](https://arxiv.org/abs/2609.01679) | A Survey on Self-Improving Test-Time Intelligence: Feedback-Driven Adapting, Learning, and Scaling at Inference | 2026-09-01 |
| <a id="ref-2507-21046"></a>[2507.21046](https://arxiv.org/abs/2507.21046) | A Survey of Self-Evolving Agents: What, When, How, and Where to Evolve | 2025-07-28 |
| <a id="ref-2601-12538"></a>[2601.12538](https://arxiv.org/abs/2601.12538) | A Survey of Agentic Reasoning for LLMs: Towards Recursively Self-Improving and Collective Agents | 2026-01-18 |
| <a id="ref-2607-07663"></a>[2607.07663](https://arxiv.org/abs/2607.07663) | Recursive Self-Improvement in AI: From Bounded Self-Refinement to Autonomous Research Loops | 2026-07-08 |
| <a id="ref-2609-13406"></a>[2609.13406](https://arxiv.org/abs/2609.13406) | Generalized Agent Iteration: One Formal Framework for Iterative Policy Improvement and RSI | 2026-09-11 |
| <a id="ref-2603-25681"></a>[2603.25681](https://arxiv.org/abs/2603.25681) | Self-Improvement of Large Language Models: A Technical Overview and Future Outlook | 2026-03-26 |
| <a id="ref-2608-18104"></a>[2608.18104](https://arxiv.org/abs/2608.18104) | Self-Evolving Agents as Dynamic Graph Transformation: A Survey and New Perspective | 2026-06-10 |
| <a id="ref-2610-38266"></a>[2610.38266](https://arxiv.org/abs/2610.38266) | Recursive Self-Improvement in Physical AI: Mechanisms, Evidence, and Evaluation | 2026-10-28 |
| <a id="ref-2512-16301"></a>[2512.16301](https://arxiv.org/abs/2512.16301) | Adaptation of Agentic AI: A Survey of Post-Training, Memory, and Skills | 2025-12-18 |

## 3. 自我修改的 harness / scaffold

| ID | 标题 | 日期 |
| --- | --- | --- |
| <a id="ref-2410-04444"></a>[2410.04444](https://arxiv.org/abs/2410.04444) | Gödel Agent: A Self-Referential Agent Framework for Recursive Self-Improvement | 2024-10-06 |
| <a id="ref-2505-22954"></a>[2505.22954](https://arxiv.org/abs/2505.22954) | Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents | 2025-05-29 |
| <a id="ref-2504-15228"></a>[2504.15228](https://arxiv.org/abs/2504.15228) | A Self-Improving Coding Agent | 2025-04-21 |
| <a id="ref-2408-08435"></a>[2408.08435](https://arxiv.org/abs/2408.08435) | Automated Design of Agentic Systems (ADAS) | 2024-08-15 |
| <a id="ref-2410-10762"></a>[2410.10762](https://arxiv.org/abs/2410.10762) | AFlow: Automating Agentic Workflow Generation | 2024-10-14 |
| <a id="ref-2502-02533"></a>[2502.02533](https://arxiv.org/abs/2502.02533) | Multi-Agent Design: Optimizing Agents with Better Prompts and Topologies | 2025-02-04 |
| <a id="ref-2510-21614"></a>[2510.21614](https://arxiv.org/abs/2510.21614) | Huxley-Gödel Machine: Human-Level Coding Agent Development by an Approximation of the Optimal Self-Improving Machine | 2025-10-24 |
| <a id="ref-2510-10232"></a>[2510.10232](https://arxiv.org/abs/2510.10232) | SGM: A Statistical Gödel Machine for Risk-Controlled Recursive Self-Modification | 2025-10-11 |
| <a id="ref-2608-07645"></a>[2608.07645](https://arxiv.org/abs/2608.07645) | Mendel Gödel Machine: Recursive Self-Improving Coding Agents via Comparative Evolution | 2026-08-07 |
| <a id="ref-2604-25850"></a>[2604.25850](https://arxiv.org/abs/2604.25850) | Agentic Harness Engineering: Observability-Driven Automatic Evolution of Coding-Agent Harnesses | 2026-04-28 |
| <a id="ref-2609-24972"></a>[2609.24972](https://arxiv.org/abs/2609.24972) | RRSI: Regularized Recursive Self-Improvement of Agent Harnesses | 2026-09-21 |
| <a id="ref-2607-13683"></a>[2607.13683](https://arxiv.org/abs/2607.13683) | HarnessBank: Semantic Gene-Bank Search with Gated Verification for Agent-Harness Self-Evolution | 2026-07-15 |
| <a id="ref-2610-30042"></a>[2610.30042](https://arxiv.org/abs/2610.30042) | HGM-Dual: Lineage-Aware Guided Agent Harness Optimization for Long-Horizon Planning | 2026-10-21 |
| <a id="ref-2610-32813"></a>[2610.32813](https://arxiv.org/abs/2610.32813) | HarnessMM: Recursive Self-Improvement for Harness Token Efficiency | 2026-10-23 |
| <a id="ref-2606-14249"></a>[2606.14249](https://arxiv.org/abs/2606.14249) | HarnessX: A Composable, Adaptive, and Evolvable Agent Harness Foundry | 2026-06-12 |
| <a id="ref-2610-19591"></a>[2610.19591](https://arxiv.org/abs/2610.19591) | L3M: A Verifiable Harness and Runtime for Self-Extending and Self-Improving Agents | 2026-10-14 |
| <a id="ref-2608-28363"></a>[2608.28363](https://arxiv.org/abs/2608.28363) | EvoUndo: Recoverability-Constrained Self-Evolution for LLM Agent Harnesses | 2026-08-28 |
| <a id="ref-2610-02616"></a>[2610.02616](https://arxiv.org/abs/2610.02616) | VERSE: Verified Self-Evolving Optimizer for Agent Harnesses | 2026-10-02 |
| <a id="ref-2606-06324"></a>[2606.06324](https://arxiv.org/abs/2606.06324) | From Failed Trajectories to Reliable LLM Agents: Diagnosing and Repairing Harness Flaws | 2026-06-04 |
| <a id="ref-2607-14159"></a>[2607.14159](https://arxiv.org/abs/2607.14159) | MemoHarness: Agent Harnesses That Learn from Experience | 2026-07-14 |
| <a id="ref-2606-01770"></a>[2606.01770](https://arxiv.org/abs/2606.01770) | Adaptive Auto-Harness: Sustained Self-Improvement for Agentic System Deployment on Open-Ended Task Streams | 2026-06-01 |
| <a id="ref-2610-14977"></a>[2610.14977](https://arxiv.org/abs/2610.14977) | EnactOpt: Diagnosis-Guided Harness Evolution for Embodied Agents | 2026-10-10 |
| <a id="ref-2610-23791"></a>[2610.23791](https://arxiv.org/abs/2610.23791) | DrugHarness: An Evolvable Agent Harness for Computational Drug Discovery | 2026-10-16 |
| <a id="ref-2610-14118"></a>[2610.14118](https://arxiv.org/abs/2610.14118) | ClawLoop: Self-Improving Agents via Harness-Native Training Loop | 2026-10-09 |
| <a id="ref-2610-37276"></a>[2610.37276](https://arxiv.org/abs/2610.37276) | Where Should the Evaluation Budget Go in LLM-Driven Agent Scaffold Evolution? | 2026-10-27 |
| <a id="ref-2605-13821"></a>[2605.13821](https://arxiv.org/abs/2605.13821) | Harnessing Agentic Evolution | 2026-05-13 |
| <a id="ref-2609-40169"></a>[2609.40169](https://arxiv.org/abs/2609.40169) | Learning from Research: Toward Lifelong Agent Harness Evolution | 2026-09-30 |
| <a id="ref-2610-04178"></a>[2610.04178](https://arxiv.org/abs/2610.04178) | SHarP: Saliency-based Pruning of Agent Harnesses | 2026-10-03 |
| <a id="ref-2609-08175"></a>[2609.08175](https://arxiv.org/abs/2609.08175) | A Theory of Reliable Self-Evolution for Agent Harnesses | 2026-09-08 |
| <a id="ref-2609-27612"></a>[2609.27612](https://arxiv.org/abs/2609.27612) | RegenHarness: A Robot Agent Harness with Evidence-Gated Recursive Self-Improvement | 2026-09-23 |
| <a id="ref-2611-04579"></a>[2611.04579](https://arxiv.org/abs/2611.04579) | FreeForm Harness: A Mobile-Native Agent Harness for Open and Composable Extensions | 2026-11-03 |

## 4. 制品：记忆、技能与经验

| ID | 标题 | 日期 |
| --- | --- | --- |
| <a id="ref-2304-03442"></a>[2304.03442](https://arxiv.org/abs/2304.03442) | Generative Agents: Interactive Simulacra of Human Behavior | 2023-04-07 |
| <a id="ref-2305-16291"></a>[2305.16291](https://arxiv.org/abs/2305.16291) | Voyager: An Open-Ended Embodied Agent with Large Language Models | 2023-05-25 |
| <a id="ref-2308-10144"></a>[2308.10144](https://arxiv.org/abs/2308.10144) | ExpeL: LLM Agents Are Experiential Learners | 2023-08-20 |
| <a id="ref-2409-07429"></a>[2409.07429](https://arxiv.org/abs/2409.07429) | Agent Workflow Memory | 2024-09-11 |
| <a id="ref-2508-16153"></a>[2508.16153](https://arxiv.org/abs/2508.16153) | Memento: Fine-tuning LLM Agents without Fine-tuning LLMs | 2025-08-22 |
| <a id="ref-2610-11794"></a>[2610.11794](https://arxiv.org/abs/2610.11794) | Memento 3: Model-Based Recursive Self-Improvement through Reflective Rulebooks | 2026-10-08 |
| <a id="ref-2605-06716"></a>[2605.06716](https://arxiv.org/abs/2605.06716) | From Storage to Experience: A Survey on the Evolution of LLM Agent Memory Mechanisms | 2026-05-07 |
| <a id="ref-2607-10113"></a>[2607.10113](https://arxiv.org/abs/2607.10113) | Dynamic Agent Skills: A Lifecycle Survey and Taxonomy of Evolving Skill Libraries | 2026-07-11 |
| <a id="ref-2608-29596"></a>[2608.29596](https://arxiv.org/abs/2608.29596) | A Systematic Survey of Agentic Skills: Architecture, Lifecycle, and Security | 2026-08-30 |
| <a id="ref-2610-24630"></a>[2610.24630](https://arxiv.org/abs/2610.24630) | Selm: Self-Evolving Library Management for Multi-Skill Agent Optimization | 2026-10-17 |
| <a id="ref-2610-23599"></a>[2610.23599](https://arxiv.org/abs/2610.23599) | From Trajectories to Differentiated Skills: Cognitive Differentiation for Self-Improving Agents | 2026-10-16 |
| <a id="ref-2610-25119"></a>[2610.25119](https://arxiv.org/abs/2610.25119) | Memory as Belief: Bayesian Evolution of Memory for Self-Evolving LLM Agents | 2026-10-18 |
| <a id="ref-2610-25126"></a>[2610.25126](https://arxiv.org/abs/2610.25126) | Trackable Skill Library Lifecycle Management for Agentic Reinforcement Learning | 2026-10-18 |
| <a id="ref-2610-18807"></a>[2610.18807](https://arxiv.org/abs/2610.18807) | SkillScaffold: Scaffolding Agentic RL with Policy-Adaptive Skill Credit Assignment and Selective Injection | 2026-10-13 |
| <a id="ref-2610-11781"></a>[2610.11781](https://arxiv.org/abs/2610.11781) | Skill-V: Verifiable Self-Evolving Skill Library for Interactive Agents | 2026-10-08 |
| <a id="ref-2608-21867"></a>[2608.21867](https://arxiv.org/abs/2608.21867) | MemGuard: Persisting Verifier Signals for LLM-Agent Memory Governance | 2026-08-22 |
| <a id="ref-2605-13941"></a>[2605.13941](https://arxiv.org/abs/2605.13941) | EvolveMem: Self-Evolving Memory Architecture via AutoResearch for LLM Agents | 2026-05-13 |

## 5. 训练时的自我改进

| ID | 标题 | 日期 |
| --- | --- | --- |
| <a id="ref-2203-14465"></a>[2203.14465](https://arxiv.org/abs/2203.14465) | STaR: Bootstrapping Reasoning With Reasoning | 2022-03-28 |
| <a id="ref-2401-10020"></a>[2401.10020](https://arxiv.org/abs/2401.10020) | Self-Rewarding Language Models | 2024-01-18 |
| <a id="ref-2407-19594"></a>[2407.19594](https://arxiv.org/abs/2407.19594) | Meta-Rewarding Language Models: Self-Improving Alignment with LLM-as-a-Meta-Judge | 2024-07-28 |
| <a id="ref-2503-00735"></a>[2503.00735](https://arxiv.org/abs/2503.00735) | LADDER: Self-Improving LLMs Through Recursive Problem Decomposition | 2025-03-02 |
| <a id="ref-2505-03335"></a>[2505.03335](https://arxiv.org/abs/2505.03335) | Absolute Zero: Reinforced Self-play Reasoning with Zero Data | 2025-05-06 |
| <a id="ref-2508-05004"></a>[2508.05004](https://arxiv.org/abs/2508.05004) | R-Zero: Self-Evolving Reasoning LLM from Zero Data | 2025-08-07 |
| <a id="ref-2506-10943"></a>[2506.10943](https://arxiv.org/abs/2506.10943) | Self-Adapting Language Models (SEAL) | 2025-06-12 |
| <a id="ref-2505-21444"></a>[2505.21444](https://arxiv.org/abs/2505.21444) | Can Large Reasoning Models Self-Train? | 2025-05-27 |
| <a id="ref-2504-13837"></a>[2504.13837](https://arxiv.org/abs/2504.13837) | Does Reinforcement Learning Really Incentivize Reasoning Capacity in LLMs Beyond the Base Model? | 2025-04-18 |
| <a id="ref-2603-08660"></a>[2603.08660](https://arxiv.org/abs/2603.08660) | How Far Can Unsupervised RLVR Scale LLM Training? | 2026-03-09 |
| <a id="ref-2404-01413"></a>[2404.01413](https://arxiv.org/abs/2404.01413) | Is Model Collapse Inevitable? Breaking the Curse of Recursion by Accumulating Real and Synthetic Data | 2024-04-01 |
| <a id="ref-2504-16084"></a>[2504.16084](https://arxiv.org/abs/2504.16084) | TTRL: Test-Time Reinforcement Learning | 2025-04-22 |
| <a id="ref-2506-11425"></a>[2506.11425](https://arxiv.org/abs/2506.11425) | Agent-RLVR: Training Software Engineering Agents via Guidance and Environment Rewards | 2025-06-13 |
| <a id="ref-2605-02913"></a>[2605.02913](https://arxiv.org/abs/2605.02913) | Generate, Filter, Control, Replay: A Comprehensive Survey of Rollout Strategies for LLM RL | 2026-04-08 |
| <a id="ref-2606-17546"></a>[2606.17546](https://arxiv.org/abs/2606.17546) | SEAGym: An Evaluation Environment for Self-Evolving LLM Agents | 2026-06-16 |
| <a id="ref-2606-28374"></a>[2606.28374](https://arxiv.org/abs/2606.28374) | Recursive Self-Evolving Agents via Held-Out Selection (RSEA) | 2026-06-17 |
| <a id="ref-2509-02547"></a>[2509.02547](https://arxiv.org/abs/2509.02547) | The Landscape of Agentic Reinforcement Learning for LLMs: A Survey | 2025-09-02 |

## 6. 优化与提示演化

| ID | 标题 | 日期 |
| --- | --- | --- |
| <a id="ref-2303-11366"></a>[2303.11366](https://arxiv.org/abs/2303.11366) | Reflexion: Language Agents with Verbal Reinforcement Learning | 2023-03-20 |
| <a id="ref-2303-17651"></a>[2303.17651](https://arxiv.org/abs/2303.17651) | Self-Refine: Iterative Refinement with Self-Feedback | 2023-03-30 |
| <a id="ref-2309-03409"></a>[2309.03409](https://arxiv.org/abs/2309.03409) | Large Language Models as Optimizers (OPRO) | 2023-09-07 |
| <a id="ref-2310-03714"></a>[2310.03714](https://arxiv.org/abs/2310.03714) | DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines | 2023-10-05 |
| <a id="ref-2406-07496"></a>[2406.07496](https://arxiv.org/abs/2406.07496) | TextGrad: Automatic "Differentiation" via Text | 2024-06-11 |
| <a id="ref-2507-19457"></a>[2507.19457](https://arxiv.org/abs/2507.19457) | GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning | 2025-07-25 |

## 7. 自动化科研与发现

| ID | 标题 | 日期 |
| --- | --- | --- |
| <a id="ref-2408-06292"></a>[2408.06292](https://arxiv.org/abs/2408.06292) | The AI Scientist: Towards Fully Automated Open-Ended Scientific Discovery | 2024-08-12 |
| <a id="ref-2504-08066"></a>[2504.08066](https://arxiv.org/abs/2504.08066) | The AI Scientist-v2: Workshop-Level Automated Scientific Discovery via Agentic Tree Search | 2025-04-10 |
| <a id="ref-2506-13131"></a>[2506.13131](https://arxiv.org/abs/2506.13131) | AlphaEvolve: A coding agent for scientific and algorithmic discovery | 2025-06-16 |
| <a id="ref-2502-18864"></a>[2502.18864](https://arxiv.org/abs/2502.18864) | Accelerating scientific discovery with Co-Scientist | 2025-02-26 |
| <a id="ref-2608-05179"></a>[2608.05179](https://arxiv.org/abs/2608.05179) | Autonomous Research Agents: A Survey of AI Scientists and the Verification Gap | 2026-06-29 |
| <a id="ref-2610-10310"></a>[2610.10310](https://arxiv.org/abs/2610.10310) | RSIGym: A Flexible Environment for Recursive Self-Improvement | 2026-10-07 |
| <a id="ref-2610-33046"></a>[2610.33046](https://arxiv.org/abs/2610.33046) | Organon: From Evolutionary Search to Recursive Self-Improving Agents for Scientific Discovery | 2026-10-17 |
| <a id="ref-2610-20431"></a>[2610.20431](https://arxiv.org/abs/2610.20431) | SwarmRSI: Recursive Self-Improvement through Evolving Scientific Agent Swarm | 2026-10-14 |
| <a id="ref-2609-26457"></a>[2609.26457](https://arxiv.org/abs/2609.26457) | Recursive self-improvement of AI research agents (AIDE²) | 2026-09-22 |
| <a id="ref-2610-13912"></a>[2610.13912](https://arxiv.org/abs/2610.13912) | RSI-Anything: Unlocking Recursive Self-Improvement with World Models | 2026-10-09 |

## 8. 评估、安全、治理与失败模式

| ID | 标题 | 日期 |
| --- | --- | --- |
| <a id="ref-2407-01502"></a>[2407.01502](https://arxiv.org/abs/2407.01502) | AI Agents That Matter | 2024-07-01 |
| <a id="ref-2503-14499"></a>[2503.14499](https://arxiv.org/abs/2503.14499) | Measuring AI Ability to Complete Long Software Tasks | 2025-03-18 |
| <a id="ref-2405-15793"></a>[2405.15793](https://arxiv.org/abs/2405.15793) | SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering | 2024-05-06 |
| <a id="ref-2610-38392"></a>[2610.38392](https://arxiv.org/abs/2610.38392) | Masked Erosion: How Acceptance Gates Lose Redundant Safeguards in Self-Improving Agents | 2026-10-28 |
| <a id="ref-2610-11464"></a>[2610.11464](https://arxiv.org/abs/2610.11464) | Who Verifies the Verifier? Co-Evolving Inspectable Graders with Self-Improving Agents | 2026-10-08 |
| <a id="ref-2609-02246"></a>[2609.02246](https://arxiv.org/abs/2609.02246) | LLM-as-a-Judge Is Not an Oracle: Why Self-Improving Agents Need Deterministic Guardrails | 2026-09-02 |
| <a id="ref-2607-13083"></a>[2607.13083](https://arxiv.org/abs/2607.13083) | Phantom Guardrails: When Self-Improving Agent Harnesses Fix Failures That Never Happened | 2026-07-13 |
| <a id="ref-2610-15964"></a>[2610.15964](https://arxiv.org/abs/2610.15964) | Small but Mighty: Test Suites as Improvement Signals for Self-Evolving Agents | 2026-10-11 |
| <a id="ref-2610-17609"></a>[2610.17609](https://arxiv.org/abs/2610.17609) | Verifier-Harness Co-Evolution for Training-Free Self-Improvement on Open-Ended Tasks (UCoE) | 2026-10-13 |
| <a id="ref-2610-22984"></a>[2610.22984](https://arxiv.org/abs/2610.22984) | Self-Evolving Agents Can Repair Failures but Struggle to Generalize from Them | 2026-10-16 |
| <a id="ref-2610-25858"></a>[2610.25858](https://arxiv.org/abs/2610.25858) | Are Self-Evolving Agents Continual Learners? | 2026-10-19 |
| <a id="ref-2610-20845"></a>[2610.20845](https://arxiv.org/abs/2610.20845) | Evolving Together, Failing Apart: The Skill-Policy Co-evolution Trap in Self-Improving Agents | 2026-10-14 |
| <a id="ref-2611-04952"></a>[2611.04952](https://arxiv.org/abs/2611.04952) | Artifact-to-Capability: Diagnosing Breaks in Capability Formation of Self-Evolving Agents | 2026-11-03 |
| <a id="ref-2611-02797"></a>[2611.02797](https://arxiv.org/abs/2611.02797) | SelfImprove-Bench: Evaluating Generalization in Self-Improving Agents | 2026-11-02 |
| <a id="ref-2610-35193b"></a>[2610.35193](https://arxiv.org/abs/2610.35193) | (见 §2) Trustworthy RSI | 2026-10-26 |
| <a id="ref-2609-08149"></a>[2609.08149](https://arxiv.org/abs/2609.08149) | SWE-Bench Pro Verified: A Reliable Benchmark for Software Engineering Agents | 2026-09-08 |
| <a id="ref-2605-09315"></a>[2605.09315](https://arxiv.org/abs/2605.09315) | Do Self-Evolving Agents Forget? Capability Degradation and Preservation in Lifelong LLM Agent Adaptation | 2026-05-10 |
| <a id="ref-2603-06333"></a>[2603.06333](https://arxiv.org/abs/2603.06333) | SAHOO: Safeguarded Alignment for High-Order Optimization Objectives in RSI | 2026-03-06 |
| <a id="ref-2510-04860"></a>[2510.04860](https://arxiv.org/abs/2510.04860) | Alignment Tipping Process: How Self-Evolution Pushes LLM Agents Off the Rails | 2025-10-06 |
| <a id="ref-2609-00069"></a>[2609.00069](https://arxiv.org/abs/2609.00069) | Auditing Harness Tampering in Self-Improving Agents | 2026-08-30 |
| <a id="ref-2610-34577"></a>[2610.34577](https://arxiv.org/abs/2610.34577) | Rethinking Verification in Agent Harnesses | 2026-10-25 |
| <a id="ref-2609-01222"></a>[2609.01222](https://arxiv.org/abs/2609.01222) | What's in Your Agent's Context? Context Privilege Escalation Attacks against AI Agent Harness | 2026-09-01 |
| <a id="ref-2610-00347"></a>[2610.00347](https://arxiv.org/abs/2610.00347) | Authorization for Self-Modifying AI Agent Populations: Conserving Authority across Replacement, Forking, and Rollback | 2026-09-29 |
| <a id="ref-2608-17597"></a>[2608.17597](https://arxiv.org/abs/2608.17597) | HarnessRisk: A Lifecycle-Oriented Benchmark for Agent Harness Safety | 2026-08-18 |
| <a id="ref-2610-04921"></a>[2610.04921](https://arxiv.org/abs/2610.04921) | Complex Agents, Shallow Tests: Demystifying and Enhancing Test Adequacy of Agent Harness in the Wild | 2026-10-04 |
| <a id="ref-2607-03691"></a>[2607.03691](https://arxiv.org/abs/2607.03691) | Don't Blame the Large Language Model: How Agent Harness Evolution Shapes Coding Agent Quality | 2026-07-04 |
| <a id="ref-2510-04399"></a>[2510.04399](https://arxiv.org/abs/2510.04399) | On The Statistical Limits of Self-Improving Agents | 2025-10-05 |
| <a id="ref-2606-28639"></a>[2606.28639](https://arxiv.org/abs/2606.28639) | Algorithmic Unverifiability of Safety for Fixed and Recursively Self-Improving Systems | 2026-06-26 |
| <a id="ref-2608-11243"></a>[2608.11243](https://arxiv.org/abs/2608.11243) | The Off-Support Barrier: Why Semantic Safety Constraints Are Not Learning-Problem Invariants | 2026-08-01 |
| <a id="ref-2610-10611"></a>[2610.10611](https://arxiv.org/abs/2610.10611) | Verification and Self-Improvement in Agentic AI: Foundations and Limits | 2026-10-07 |
| <a id="ref-2606-26057"></a>[2606.26057](https://arxiv.org/abs/2606.26057) | The Unfireable Safety Kernel: Execution-Time AI Alignment for AI Agents | 2026-06-24 |
| <a id="ref-2609-33123"></a>[2609.33123](https://arxiv.org/abs/2609.33123) | Compositional Safety Failures in Harness Evolution: Identification and Runtime Monitoring | 2026-09-27 |
| <a id="ref-2609-04665"></a>[2609.04665](https://arxiv.org/abs/2609.04665) | Harness-agnostic detection and immunization of reward hacking in self-evolving language models | 2026-09-04 |
| <a id="ref-2606-08106"></a>[2606.08106](https://arxiv.org/abs/2606.08106) | PACE: Anytime-Valid Acceptance Tests for Self-Evolving Agents | 2026-06-06 |
| <a id="ref-2609-36043"></a>[2609.36043](https://arxiv.org/abs/2609.36043) | SAGE: A Statistical Acceptance Gate for Self-Evolving Agents | 2026-09-28 |
| <a id="ref-2607-24300"></a>[2607.24300](https://arxiv.org/abs/2607.24300) | Self-Authored Verification Is Unreliable in Heuristic Self-Improving Agents | 2026-07-27 |
| <a id="ref-2605-14271"></a>[2605.14271](https://arxiv.org/abs/2605.14271) | Auditing Agent Harness Safety | 2026-05-14 |
| <a id="ref-2610-14488"></a>[2610.14488](https://arxiv.org/abs/2610.14488) | Names Are Not Objects: Object-Bound Confinement for Compromised AI Coding Agents | 2026-10-10 |
| <a id="ref-2610-22987"></a>[2610.22987](https://arxiv.org/abs/2610.22987) | From Approval to Abuse: Privilege Escalation Attacks on Harness-Protected Coding Agents | 2026-10-16 |
| <a id="ref-2610-40753"></a>[2610.40753](https://arxiv.org/abs/2610.40753) | "Shall We Approve?" Consequence-Aware Approval for Autonomous Coding Agents | 2026-10-29 |
| <a id="ref-2604-08988"></a>[2604.08988](https://arxiv.org/abs/2604.08988) | SEA-Eval: A Benchmark for Evaluating Self-Evolving Agents Beyond Episodic Assessment | 2026-04-10 |
| <a id="ref-2608-02670"></a>[2608.02670](https://arxiv.org/abs/2608.02670) | Permission Denied: Policy-Graded Evaluation of Coding Agents in Hardened Environments | 2026-08-02 |
| <a id="ref-2608-12851"></a>[2608.12851](https://arxiv.org/abs/2608.12851) | Practice Makes Unsafe: Skill Misevolution in Self-Improving LLM Agents | 2026-08-13 |
| <a id="ref-2610-00093"></a>[2610.00093](https://arxiv.org/abs/2610.00093) | Safety in Self-Evolving Agents: A Survey | 2026-09-08 |
| <a id="ref-2610-39417"></a>[2610.39417](https://arxiv.org/abs/2610.39417) | Well-Specified and Well-Tested? Assessing SWE-bench-Style Datasets with a Self-Evolving Agent | 2026-10-29 |

## 9. 研究全景数据（非论文引用）

| 来源 | 内容 | 访问时间 |
| --- | --- | --- |
| arXiv `export.arxiv.org/api/query` | 40 组检索式 + 经典文献补充 → 1,101 篇去重论文（标题/摘要/日期/作者） | 2026-11-04T08:43Z |
| arXiv `id_list` 核验 | 50 篇锚点 + 10 篇 2026 二次核验，全部解析成功 | 2026-11-04T08:40Z / 08:50Z |
| 引用终核 | 正文引用的 **139 个** arXiv ID 再次批量核验，139/139 解析成功、0 缺失（`data/verified_papers.json`） | 2026-11-04T09:10Z |
| `gh search repos` | 15 组检索 → 155 个去重仓库（stars/描述/更新时间） | 2026-11-04T08:41Z |
| `gh repo view` / `gh api` | 逐库核验 stars、许可证、最后推送、README 摘要；非商业许可经 LICENSE 正文确认 | 2026-11-04 |

### 9.1 可复现数据包

本目录的 `data/` 包含核验所需的全部原始数据与脚本：

| 文件 | 内容 |
| --- | --- |
| `data/fetch_arxiv.py` | 40 组检索式的语料抓取脚本（可直接重跑） |
| `data/fetch_github.py` | 15 组 `gh search repos` 检索脚本 |
| `data/verify_ids.py` | 论文 ID 批量核验脚本 |
| `data/arxiv_corpus.json.gz` | 1,101 篇去重论文（id/标题/日期/作者/URL/命中检索式） |
| `data/verified_papers.json` | 139 个正文引用 ID 的 API 核验结果（标题 + 首次提交日期） |
| `data/github_repos.json` | 155 个去重仓库（stars/描述/语言/更新时间） |

重跑方式：

```sh
cd docs/research/rsi-agent-harness/data
python3 fetch_arxiv.py      # 重建 arXiv 语料（需要网络，约 4 分钟）
python3 fetch_github.py     # 重建 GitHub 仓库清单（需要 gh 已登录）
python3 verify_ids.py       # 重新核验论文 ID
```

## 10. 引用完整性声明

- 本页所有 arXiv ID 均经 API 核验（正文引用共 139 个，139/139 成功）；不存在未核验的 ID。
- 所有**数字**（基准分数、成本、比例）均为**论文作者自报**，除非行文明确标注"独立核验"或"本调研计算"。
- 本调研**未**复现任何论文的实验；未做性能、安全或模糊测试。
- 语料统计（1,101 篇/155 仓库）在"检索语料"范围内成立，**不**外推为整个领域的规模。
- 社会指标（stars 等）与许可证为 2026-11-04 快照，会随时间变化；许可证应以仓库当前 LICENSE 为准。
- 子领域调研中的部分主张来自摘要而非全文；标注"自报"或未核验的条目未纳入正文结论。
