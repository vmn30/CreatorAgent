# CreatorAgent — AI × Creator Economy

> **One Agent. Full Creative Pipeline. From Topic to On-chain Publication.**

A submission for the **Z.AI Track | Web3 × Long-Horizon Task** at the AI × Web3 Agentic Builders Hackathon 2026.

---

## Overview

CreatorAgent demonstrates GLM-5.1's ability to autonomously execute **long-horizon, multi-step content creation tasks**. A user inputs a topic, and the AI Agent autonomously plans, researches, writes, illustrates, reviews, formats, and publishes a complete research article on-chain — with the entire multi-step workflow visible in real-time.

### Key Innovation

This project goes beyond single-shot content generation. The Agent:

1. **Autonomously breaks down complex tasks** — decomposes a topic into research queries, outlines, and writing plans
2. **Creates and executes multi-step plans** — follows a structured 8-step workflow from planning to on-chain publication
3. **Continuously iterates and self-corrects** — reviews its own output and iterates to improve quality
4. **Calls multiple tools in sequence** — uses web search, image generation, and LLM chat across steps
5. **Completes end-to-end Web3 workflows** — from requirement understanding to on-chain publication with verifiable proof

---

## Agent Workflow (8 Steps)

| Step | Description | Tools Used |
|------|-------------|------------|
| 1. **Plan** | Break down the topic into a detailed research and writing plan | GLM-5.1 Chat |
| 2. **Research** | Search the web for relevant information and synthesize findings | Web Search + GLM-5.1 Chat |
| 3. **Outline** | Create a structured article outline with section titles and key points | GLM-5.1 Chat |
| 4. **Write** | Generate a comprehensive research article section by section | GLM-5.1 Chat |
| 5. **Illustrate** | Generate a professional cover image for the article | Image Generation |
| 6. **Review** | Self-review for quality, completeness, and accuracy | GLM-5.1 Chat |
| 7. **Format** | Format into a polished, publication-ready markdown document | GLM-5.1 Chat |
| 8. **Publish** | Register content on blockchain with verifiable proof | On-chain Simulation |

---

## Tech Stack

- **Framework**: Next.js 16 with App Router + TypeScript
- **AI Engine**: GLM-5.1 (via z-ai-web-dev-sdk)
- **Tools**: Web Search, Image Generation, LLM Chat Completions
- **Database**: Prisma ORM + SQLite
- **Real-time**: Socket.io (WebSocket) for live progress updates
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Web3**: Simulated on-chain publication (Ethereum testnet-ready)

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                   Frontend                   │
│  ┌─────────┬──────────┬───────────────────┐ │
│  │ Create  │  Result  │     Gallery       │ │
│  │  Tab    │   Tab    │      Tab          │ │
│  └────┬────┴─────┬────┴────────┬──────────┘ │
│       │          │             │             │
│       ▼          ▼             ▼             │
│  ┌────────────────────────────────────────┐  │
│  │        WebSocket (Socket.io)           │  │
│  │      Real-time progress updates        │  │
│  └──────────────────┬─────────────────────┘  │
└─────────────────────┼────────────────────────┘
                      │
┌─────────────────────┼────────────────────────┐
│              Backend (API Routes)             │
│  ┌──────────────────┼─────────────────────┐  │
│  │         Agent Orchestrator              │  │
│  │  Plan → Research → Outline → Write →   │  │
│  │  Illustrate → Review → Format → Publish │  │
│  └──────┬───────┬──────────┬──────────────┘  │
│         │       │          │                  │
│    ┌────▼──┐ ┌──▼───┐ ┌───▼──────┐          │
│    │GLM-5.1│ │Search│ │  Image   │          │
│    │ Chat  │ │      │ │  Gen     │          │
│    └───────┘ └──────┘ └──────────┘          │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │    Prisma ORM + SQLite Database        │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Z.AI API access (for GLM-5.1, Web Search, Image Generation)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd creator-agent

# Install dependencies
bun install

# Set up the database
bun run db:push

# Start the WebSocket service
cd mini-services/agent-ws && bun install && bun run dev &

# Start the development server
bun run dev
```

### Usage

1. Open `http://localhost:3000` in your browser
2. Enter a topic or select a demo topic
3. Click **Start** to begin the agent workflow
4. Watch real-time progress as the agent executes each step
5. Once complete, view the result with the full article and on-chain proof
6. Browse the gallery for previously created content

---

## Judging Criteria Alignment

### 1. Track Fit: Web3 × Long-Horizon Task ✅
The project focuses on a complete content creation pipeline — not just Q&A or single-generation. The Agent autonomously executes 8 sequential steps spanning planning, research, writing, and on-chain publication.

### 2. Critical Use of GLM-5.1 ✅
GLM-5.1 drives the Agent's core long-horizon task: task decomposition (Plan), information synthesis (Research), structured creation (Outline + Write), quality assurance (Review), and production (Format + Publish). Every step demonstrates autonomous planning, continuous execution, and self-correction.

### 3. Task Complexity and Closed-Loop Completion ✅
The demo covers the full chain: requirement understanding → planning → execution → validation → repair → delivery. Each step builds on previous outputs, and the Review step explicitly checks and iterates on quality.

### 4. Long-Horizon Stability ✅
Across 8 steps, multiple tool calls, and 3-5 minutes of execution, the Agent stays aligned with the goal. Each step receives context from previous steps and produces output for subsequent ones.

### 5. Web3 Value ✅
The project solves real problems in Web3 content creation: automated research article production, on-chain content registration, NFT minting for published content, and verifiable on-chain proof of authorship.

### 6. Demo Quality and Reproducibility ✅
The demo runs stably with real-time progress visualization. Judges can clearly see the Agent autonomously completing tasks, making tool calls, and producing results. Execution logs with timestamps are available.

### 7. Safety, Cost, and Permission Boundaries ✅
The project documents: API usage boundaries, simulated on-chain interactions (no real assets), error handling at each step, and human intervention points (user initiates and can cancel the workflow).

---

## File Structure

```
src/
├── app/
│   ├── page.tsx                    # Main single-page UI
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   └── api/
│       ├── agent/
│       │   ├── start/route.ts      # POST: start new session
│       │   ├── execute/route.ts    # POST: execute next step
│       │   └── run-full/route.ts   # POST: run full workflow
│       ├── sessions/
│       │   ├── route.ts            # GET: list all sessions
│       │   └── [id]/route.ts       # GET: get session detail
│       └── generate-image/route.ts # POST: generate image
├── lib/
│   ├── agent.ts                    # Agent orchestration logic
│   ├── agent-types.ts              # Type definitions and constants
│   ├── db.ts                       # Prisma client
│   └── utils.ts                    # Utility functions
├── components/
│   ├── agent-workflow.tsx          # Workflow visualization
│   ├── content-viewer.tsx          # Article content viewer
│   ├── on-chain-proof.tsx          # On-chain proof display
│   ├── creation-gallery.tsx        # Gallery of created content
│   └── ui/                         # shadcn/ui components
mini-services/
└── agent-ws/
    ├── index.ts                    # WebSocket server
    └── package.json                # Mini-service package
prisma/
└── schema.prisma                   # Database schema
```

---

## License

MIT

---

## Team

Built for the AI × Web3 Agentic Builders Hackathon 2026 — Z.AI Track.
