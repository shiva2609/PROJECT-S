import React, { createContext, useContext, ReactNode } from 'react';

interface MessageContextType {
  // Placeholder for future message-related global state
  // Currently, useMessageManager handles all message logic
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

interface MessageProviderProps {
  children: ReactNode;
}

/**
 * Global context provider for message-related state
 * Currently a placeholder - useMessageManager handles all logic
 */
export function MessageProvider({ children }: MessageProviderProps) {
  const value: MessageContextType = {};

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
}

export function useMessageContext(): MessageContextType {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error('useMessageContext must be used within a MessageProvider');
  }
  return context;
}



