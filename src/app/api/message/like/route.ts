import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { getServerSession } from "next-auth";

export async function PUT(req: Request) {
  try {
    const { timestamp, chatId }: { timestamp: number; chatId: string } =
      await req.json();
    const session = await getServerSession(authOptions);

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Make sure user is actually part of this chat
    const [userId1, userId2] = chatId.split("--");
    if (session.user.id !== userId1 && session.user.id !== userId2) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Make sure user is friends with chat partner
    const friendId = session.user.id === userId1 ? userId2 : userId1;
    const friendList = (await fetchRedis(
      "smembers",
      `user:${session.user.id}:friends`
    )) as string[];
    const isFriend = friendList.includes(friendId);
    if (!isFriend) {
      return new Response("Unauthorized", { status: 401 });
    }

    const messages: Message[] = await db.zrange(
      `chat:${chatId}:messages`,
      0,
      -1,
      {
        rev: true,
      }
    );

    const message = messages.find((message) => message.timestamp === timestamp);

    if (!message) {
      return new Response("Message with that timestamp does not exist", {
        status: 400,
      });
    }

    await db.zrem(`chat:${chatId}:messages`, message);

    message.isLiked = !message.isLiked;

    pusherServer.trigger(
      toPusherKey(`chat:${chatId}`),
      "incoming-like",
      messages
    );

    await db.zadd(`chat:${chatId}:messages`, {
      score: timestamp,
      member: JSON.stringify(message),
    });

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      return new Response(error.message, { status: 500 });
    }

    return new Response("Internal Server Error", { status: 500 });
  }
}
