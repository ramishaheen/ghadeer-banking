import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";
import { rafiqRespond } from "@/lib/rafiq";

export const GET = withApi(async (req) => {
  const user = await requireSessionUser();
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
  // Most recent N messages, returned in chronological order.
  const recent = await prisma.chatMessage.findMany({
    where: { userId: user.id, sessionId: "default" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return ok({ messages: recent.reverse() });
});

const ChatSchema = z.object({
  message: z.string().min(1).max(1000),
});

export const POST = withApi(async (req) => {
  const user = await requireSessionUser();
  const { message } = ChatSchema.parse(await req.json());

  const userMsg = await prisma.chatMessage.create({
    data: { userId: user.id, role: "user", content: message },
  });

  const reply = await rafiqRespond(user.id, message);

  const rafiqMsg = await prisma.chatMessage.create({
    data: {
      userId: user.id,
      role: "rafiq",
      content: reply.content,
      contentAr: reply.contentAr,
      actions: JSON.stringify(reply.actions),
      meta: reply.meta ? JSON.stringify(reply.meta) : null,
    },
  });

  return ok({ userMessage: userMsg, rafiqMessage: rafiqMsg });
});
