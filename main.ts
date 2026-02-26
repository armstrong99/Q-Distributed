import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";

/**
 * DATA STORE (The "Global Cache")
 * In production, this moves to Redis/Postgres.
 */
const questions = new Map<number, string>([
  [1, "What is the capital of France?"],
  [2, "What is 2 + 2?"],
  [3, "Who wrote '1984'?"],
  [4, "What is the speed of light?"],
  [5, "Which planet is known as the Red Planet?"],
]);

// Track the last acknowledged sequence per client
const clientAcks = new Map<string, number>();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

app.use(express.json());

/**
 * RECONCILE ENDPOINT
 * Standard Stateless HTTP/2 approach for reconnecting clients.
 */
app.get("/reconcile", (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  const lastSeq = parseInt(req.query.lastSeq as string) || 0;

  if (!clientId) {
    return res.status(400).json({ error: "clientId is required" });
  }

  // Find all questions with sequence > lastSeq
  const missedQuestions = Array.from(questions.entries())
    .filter(([seq]) => seq > lastSeq)
    .map(([seq, text]) => ({ seq, text }));

  console.log(`[Reconcile] Client ${clientId} catching up from seq ${lastSeq}`);

  return res.json({
    clientId,
    missedQuestions,
    nextExpectedSeq: lastSeq + missedQuestions.length + 1,
  });
});

/**
 * SOCKET CONNECTION
 * Handles real-time delivery and the ACK loop.
 */
io.on("connection", (socket) => {
  const clientId = socket.handshake.query.clientId as string;

  if (!clientId) {
    socket.disconnect();
    return;
  }

  console.log(`[Connect] Client connected: ${clientId}`);

  // Handle Incoming ACK from Client
  socket.on("ack", (seq: number) => {
    const currentAck = clientAcks.get(clientId) || 0;

    // Logic: Only update if the sequence is higher (Idempotency)
    if (seq > currentAck) {
      clientAcks.set(clientId, seq);
      console.log(`[ACK] Client ${clientId} acknowledged up to seq ${seq}`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`[Disconnect] Client ${clientId} offline`);
  });
});

/**
 * BROADCAST SIMULATOR
 * Simulates a "Live Host" pushing questions via Kafka/Postgres trigger
 */
let currentGlobalSeq = 0;
setInterval(() => {
  if (currentGlobalSeq < questions.size) {
    currentGlobalSeq++;
    const payload = {
      seq: currentGlobalSeq,
      question: questions.get(currentGlobalSeq),
    };

    console.log(`[Broadcast] Sending Question #${currentGlobalSeq}`);
    io.emit("question", payload);
  }
}, 10000); // Send every 10 seconds

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`EDAT Quiz Engine running on http://localhost:${PORT}`);
});
