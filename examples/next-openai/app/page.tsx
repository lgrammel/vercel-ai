'use client';

import { useChat } from 'ai/react';
import { useState } from 'react';

export default function Chat() {
  const [chatId, setChatId] = useState<number | undefined>(undefined);
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    id: chatId?.toString(),
  });

  // Function for handling the reset action
  const handleReset = () => {
    setChatId(chatId => (chatId ?? 0) + 1);
  };

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.length > 0
        ? messages.map(m => (
            <div key={m.id} className="whitespace-pre-wrap">
              {m.role === 'user' ? 'User: ' : 'AI: '}
              {m.content}
            </div>
          ))
        : null}

      <form onSubmit={handleSubmit}>
        <input
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={handleInputChange}
        />
        <button
          type="button"
          className="fixed bottom-0 w-20 p-2 mb-8 text-white bg-blue-500 rounded hover:bg-blue-700"
          onClick={handleReset}
          style={{ transform: 'translateY(100%)' }}
        >
          Reset
        </button>
      </form>
    </div>
  );
}
