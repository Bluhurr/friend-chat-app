"use client";

import { pusherClient } from "@/lib/pusher";
import { cn, toPusherKey } from "@/lib/utils";
import { Message } from "@/lib/validations/message";
import axios from "axios";
import { format } from "date-fns";
import Image from "next/image";
import { FC, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Heart, Reply } from "lucide-react";

interface MessagesProps {
  initialMessages: Message[];
  sessionId: string;
  chatId: string;
  sessionImg: string | null | undefined;
  chatPartner: User;
  handleReplyMessage: (message: string | null) => void;
}

const Messages: FC<MessagesProps> = ({
  initialMessages,
  sessionId,
  chatId,
  sessionImg,
  chatPartner,
  handleReplyMessage,
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const scrollDownRef = useRef<HTMLDivElement | null>(null);

  const formatTimestamp = (timestamp: number) => {
    return format(timestamp, "HH:mm");
  };

  const likeMessage = async (timestamp: number) => {
    const messageToLikeIndex = messages.findIndex(
      (message) => message.timestamp === timestamp
    );
    const updatedMessages = [...messages];
    updatedMessages[messageToLikeIndex].isLiked =
      !updatedMessages[messageToLikeIndex].isLiked;
    setMessages(updatedMessages);

    try {
      await axios.put("/api/message/like", { timestamp, chatId });
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong. Please try again later.");
    }
  };

  useEffect(() => {
    pusherClient.subscribe(toPusherKey(`chat:${chatId}`));

    const messageHandler = (message: Message) => {
      setMessages((prev) => [message, ...prev]);
      handleReplyMessage(null);
    };

    const likeHandler = (updatedMessages: Message[]) => {
      setMessages([...updatedMessages]);
    };

    pusherClient.bind("incoming-message", messageHandler);
    pusherClient.bind("incoming-like", likeHandler);

    return () => {
      pusherClient.unsubscribe(toPusherKey(`chat:${chatId}`));
      pusherClient.unbind("incoming-message", messageHandler);
      pusherClient.unbind("incoming-like", likeHandler);
    };
  }, [chatId, sessionId, handleReplyMessage]);

  return (
    <div
      id="messages"
      className="flex h-full flex-1 flex-col-reverse gap-4 p-3 overflow-y-auto scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch"
    >
      <div ref={scrollDownRef} />

      {messages.map((message, index) => {
        const isCurrentUser = message.senderId === sessionId;

        const hasNextMessageFromSameUser =
          messages[index - 1]?.senderId === messages[index].senderId;

        return (
          <div
            key={`${message.id}-${message.timestamp}`}
            className="chat-message"
          >
            <div
              className={cn("flex items-end", {
                "justify-end": isCurrentUser,
              })}
            >
              <div
                className={cn(
                  "flex flex-col space-y-2 text-base group break-all max-w-md mx-2 relative",
                  {
                    "order-1 items-end": isCurrentUser,
                    "order-2 items-start": !isCurrentUser,
                  }
                )}
              >
                <div
                  title="Reply to Message"
                  className={cn(
                    "flex hover:cursor-pointer active:bg-indigo-400 transition-colors duration-150 group-hover:flex like-button hidden h-6 w-6 justify-center items-center absolute rounded-full outline outline-2 bg-indigo-100 outline-indigo-500 p-1.5 bottom-[-0.8rem]",
                    {
                      "right-[1.5rem]": !isCurrentUser,
                      "left-[1.5rem]": isCurrentUser,
                    }
                  )}
                  onClick={() => {
                    handleReplyMessage(message.text);
                  }}
                >
                  <Reply
                    className={cn("h-4 w-4 text-indigo-500 fill-transparent")}
                    fill={"false"}
                  />
                </div>
                <div
                  title="Like Message"
                  className={cn(
                    "like-button hidden h-6 w-6 justify-center items-center absolute rounded-full outline outline-2 bg-indigo-100 outline-indigo-500 p-1.5 bottom-[-0.8rem]",
                    {
                      flex: message.isLiked,
                      "right-[-0.5rem] hover:cursor-pointer group-hover:flex ":
                        !isCurrentUser,
                      "left-[-0.5rem]": isCurrentUser,
                    }
                  )}
                  onClick={() => {
                    !isCurrentUser && likeMessage(message.timestamp);
                  }}
                >
                  {message.isLiked ? (
                    <Heart
                      className={cn(
                        "like-heart h-4 w-4 text-indigo-500 fill-indigo-500"
                      )}
                      fill="true"
                    />
                  ) : (
                    <Heart
                      className={cn("h-4 w-4 text-indigo-500 fill-transparent")}
                      fill="true"
                    />
                  )}
                </div>
                {message.replyingTo ? (
                  <span className="translate-y-5 z-[-1] bg-indigo-300 py-2 px-3 rounded-lg text-indigo-500">
                    {message.replyingTo}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "px-4 py-3 rounded-lg inline-block break-words",
                    {
                      "bg-indigo-600 text-white": isCurrentUser,
                      "bg-gray-200 text-gray-900": !isCurrentUser,
                      "rounded-br-none":
                        !hasNextMessageFromSameUser && isCurrentUser,
                      "rounded-bl-none":
                        !hasNextMessageFromSameUser && !isCurrentUser,
                    }
                  )}
                >
                  {message.text}{" "}
                  <span className="ml-2 text-sm text-gray-400">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </span>
              </div>

              <div
                className={cn("relative w-6 h-6", {
                  "order-2": isCurrentUser,
                  "order-1": !isCurrentUser,
                  invisible: hasNextMessageFromSameUser,
                })}
              >
                <Image
                  fill
                  src={
                    isCurrentUser ? (sessionImg as string) : chatPartner.image
                  }
                  alt="Profile Picture"
                  referrerPolicy="no-referrer"
                  className="rounded-full"
                ></Image>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Messages;
