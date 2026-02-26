# Quiz Engine: Reliable Delivery System

A high-performance, ordered question delivery system designed for high-stakes quizzes. This project implements a guaranteed delivery pattern with client-side ACK tracking and a reconcile mechanism for flaky connections.

---

## 🏗 Architectural Evolution

### 1. The Small Scale (Up to 4k Users)

**Strategy:** Write-Ahead Log (WAL)
For smaller groups, we prioritize simplicity. Using a system like **Kafka**, we treat the quiz as an immutable stream.

- **Ordering:** Native to Kafka partitions.
- **Logic:** Minimal application code; Kafka handles the ingress and egress.
- **Recovery:** Clients seek offsets directly.

### 2. The Enterprise Level (100k+ Users)

**Strategy:** Tiered Loading & Stateless Reconciliation
To handle massive concurrency, we move logic to the edge and use Redis as a high-speed workbench.

- **Source of Truth:** Postgres or Kafka (upstream batching).
- **Global Cache:** Redis stores the current "window" of questions (e.g., 1-100) with a TTL.
- **ACK Storm Mitigation:** \* **Lua Scripting:** Atomic "Get-Check-Set" operations inside Redis to handle thousands of ACKs/sec.
  - **Stateless Protocols:** We favor **HTTP/2** over WebSockets to eliminate the memory overhead of 100k persistent TCP connections.
  - **Batching:** Clients batch ACKs to reduce network chatter.

---

## 🛠 Features

- **Guaranteed Ordering:** Every question has a monotonic sequence ID.
- **Idempotent ACKs:** Server-side logic prevents "progress rollback" from delayed packets.
- **Gap Detection:** Clients detect missing sequences and trigger self-healing.
- **Reconcile Endpoint:** A dedicated `GET /reconcile` path allows clients to "catch up" instantly after a disconnection.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- TypeScript

### Installation

```bash
npm install express socket.io
npm install -D typescript @types/node @types/express ts-node
npx tsc --init
```
# Q-Distributed
