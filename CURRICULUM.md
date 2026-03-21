# The Intelligent Builder — Redesigned Curriculum

## Context

**Who you are:** A non-technical product builder who works in tech. You've shipped 3+ real projects (Health Hub, stock bot, crypto bot) in ~1 month by directing Claude in plain English. You understand tech concepts at a business level (APIs, databases, servers) but can't read or write code, can't troubleshoot when things break, and have zero formal coding experience.

**Your goal:** Be good. Understand what the agent is doing. Build real things with genuine comprehension. Not just proficient — competent and independent enough to diagnose, direct, and evaluate.

**Your learning style:** Hands-on, iterative, outcome-driven. You learn by building and refining, not by reading documentation.

**My role:** Professor, mentor, project manager. I never build for you. I teach, assess retention conversationally, and delegate build tasks to subagents while maintaining your learning context.

---

## The Problem With Your Original 30-Chapter Plan

Your original plan assumed you could read code. You can't. Anthropic Academy courses assume the same. So we can't just follow their curriculum — but we shouldn't ignore it either. We take what's useful, skip what assumes too much, and fill the gaps with fundamentals taught through analogy, not jargon.

---

## Restructured Curriculum: 5 Phases

### Phase 1 — "What Am I Looking At?" (Foundation)
**Goal:** Understand what code IS, what the pieces mean, and how to read what Claude builds for you.

No writing code yet. Just reading and understanding.

- **What is code?** — It's a recipe. Variables are ingredients, functions are steps, loops repeat steps, conditions are "if/then" decisions.
- **How does a web app work?** — Using Health Hub as the example. The browser is the kitchen, the server is the supply room, the database is the pantry, the API is the delivery service between them.
- **Reading your own code** — We walk through actual Health Hub files together. I point at lines, you tell me what you think they do. I correct and explain.
- **File structure** — Why things live where they live. What `index.html` does vs `api/analyze.js` vs `manifest.json`.
- **Errors as clues** — What error messages actually say. They're not gibberish — they're the app telling you exactly what went wrong, in a specific format.

**Retention check:** I show you a snippet from your own app. You explain what it does in plain English. If you can't, we revisit.

---

### Phase 2 — "Let Me Try" (Hands-On Coding Basics)
**Goal:** Write small things by hand. Build the muscle memory of turning logic into syntax.

Python, because that's where the AI ecosystem lives.

- **Variables and data types** — Naming boxes and putting things in them
- **Functions** — Teaching the computer a new trick it can repeat
- **Conditionals** — If this, do that. Otherwise, do this other thing.
- **Loops** — Do this thing 10 times. Or do it until something changes.
- **Lists and dictionaries** — A grocery list vs a phone book
- **Reading and writing files** — Opening a drawer, looking inside, putting something back
- **Calling an API** — Ordering from a menu and getting food back

Each concept: I explain with analogy → you write it by hand → you run it → we talk about what happened.

**Retention check:** I give you a small challenge. "Write a function that takes a grocery list and tells you how many items cost more than $5." You do it without help.

---

### Phase 3 — "Now I Understand Claude" (AI Fundamentals + Prompt Engineering)
**Goal:** Understand how Claude actually works, why prompts matter, and how to communicate with precision.

- **How LLMs work** — Not math, just the concept. Claude is a prediction machine trained on text. It doesn't "know" things, it predicts what comes next. That's why HOW you ask matters.
- **Tokens and context windows** — You're paying by the word, and Claude can only hold so much in its head at once. Like a whiteboard that gets erased when it's full.
- **System prompts, user prompts, assistant responses** — The three roles in every conversation. System = the boss setting rules. User = you. Assistant = Claude.
- **Prompt engineering fundamentals** — Use Anthropic's interactive tutorial (9 chapters, Jupyter notebooks) but I walk you through it and translate the jargon.
- **Structured outputs** — Asking Claude to respond in a specific format (JSON) so your app can use the answer, not just a human.
- **Tool use** — Giving Claude a menu of actions it can take. Like giving a new employee a list of things they're allowed to do.

**Retention check:** I give you a bad prompt. You rewrite it and explain what you changed and why.

**Anthropic Academy integration:** Complete "Claude 101" and "AI Fluency" courses. Report back, I quiz you.

---

### Phase 4 — "Building With Understanding" (Real Applications)
**Goal:** Build a real project from scratch — but this time you understand every piece.

- **Claude API from Python** — Make your first API call by hand. Send a message, get a response, print it. You wrote the code.
- **Build a CLI tool** — Something simple and useful to you. A meal estimator? A workout suggester? You decide. But YOU write the logic with my guidance.
- **Error handling** — What happens when things go wrong. Try/except is just "try this, and if it fails, do this instead."
- **Environment variables** — Why you don't put passwords in your code. Like not writing your PIN on your debit card.
- **Deploying something** — Taking your local project and putting it on the internet.
- **Connecting to a database** — Supabase, since you already use it. But this time you understand what a query is and how data flows.

**Retention check:** You build the project. I review it. You explain every file and function. If you can't explain it, you didn't learn it — we go back.

**Anthropic Academy integration:** Complete "Claude API Development Guide" and "API Fundamentals" courses alongside the build.

---

### Phase 5 — "The Agentic Layer" (Agent SDK, MCP, Automation)
**Goal:** Understand and build agentic workflows. This is the advanced stuff — where you're headed.

- **What is an agent?** — It's Claude with hands. Instead of just answering questions, it can take actions — read files, run commands, search the web, call APIs.
- **Agent SDK** — The toolkit for building agents programmatically. You'll build one.
- **MCP (Model Context Protocol)** — A universal plug system. Like USB-C for AI. Instead of custom-wiring every tool, MCP gives Claude a standard way to connect to anything.
- **Building an MCP server** — You'll build one that exposes your Health Hub data to Claude.
- **Subagents** — An agent that delegates to other agents. Like a manager assigning tasks to specialists.
- **Hooks and permissions** — Guardrails. What the agent is and isn't allowed to do. Like giving an employee a badge that only opens certain doors.
- **Testing and evaluation** — How do you know your agent works? How do you know it doesn't hallucinate?
- **Cost management** — Understanding what things cost and how to keep bills reasonable.

**Retention check:** You architect a multi-agent system on paper first — explain what each agent does, what tools it has, what can go wrong. Then you build it.

**Anthropic Academy integration:** Complete MCP courses (basic + advanced) and "Introduction to Agent Skills."

---

## Capstone Project

Build a complete application that uses everything: Claude API, Agent SDK, a custom MCP server, proper error handling, tests. The application is yours to choose — but it must demonstrate real comprehension, not just "Claude built it and it works."

**Optional:** Prep for and take the Claude Certified Architect Foundations (CCAF) exam. Free, covers exactly what you've learned.

---

## How Sessions Work

1. **Each session starts with a check-in** — What did you learn since last time? Quick retention questions.
2. **I teach a concept** — Short, analogy-driven, no jargon.
3. **You do something with it** — Write code, explain a concept back, analyze something.
4. **I assess** — Did it stick? If yes, we move on. If no, we try a different angle.
5. **Build tasks get delegated** — When you need scaffolding or boilerplate, I send it to a subagent. You still do the thinking.

---

## Timeline (in hours of focused work)

You move when you're ready. These are seat-time estimates, not calendar time.

- Phase 1: ~6-8 hours (reading, not writing — moves fast)
- Phase 2: ~15-20 hours (writing code by hand is slower, that's the point)
- Phase 3: ~10-12 hours (conceptual + Anthropic Academy courses)
- Phase 4: ~20-25 hours (real build, this is where it gets dense)
- Phase 5: ~20-25 hours (agents, MCP, advanced patterns)
- Capstone: ~15-20 hours

**~85-110 hours total.** At 1-2 hours a day, that's roughly 2-3 months. At your pace (you ship fast), probably closer to the low end.

---

## Verification / How We Know It's Working

- You can read your own Health Hub code and explain what any given section does
- You can write a Python script from scratch that calls the Claude API
- You can debug a simple error without AI help
- You can architect an agent system and explain every component
- You can pass the CCAF exam (optional but recommended)
