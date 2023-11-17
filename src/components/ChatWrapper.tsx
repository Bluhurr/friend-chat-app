"use client";

import { FC, useState } from "react";
import ChatInput from "./ChatInput";
import Messages from "./Messages";

interface ChatWrapperProps {
  initialMessages: Message[];
  sessionId: string;
  chatId: string;
  sessionImg: string | null | undefined;
  chatPartner: User;
}

const ChatWrapper: FC<ChatWrapperProps> = ({
  initialMessages,
  chatPartner,
  sessionId,
  chatId,
  sessionImg,
}) => {
  const [replyingToMessage, setReplyingToMessage] = useState<string | null>(
    null
  );

  const handleReplyMessage = (message: string | null) => {
    setReplyingToMessage(message);
  };

  return (
    <>
      <Messages
        chatPartner={chatPartner}
        sessionImg={sessionImg}
        initialMessages={initialMessages}
        sessionId={sessionId}
        chatId={chatId}
        handleReplyMessage={handleReplyMessage}
      />
      <ChatInput
        chatPartner={chatPartner}
        chatId={chatId}
        replyingToMessage={replyingToMessage}
      />
    </>
  );
};

export default ChatWrapper;
