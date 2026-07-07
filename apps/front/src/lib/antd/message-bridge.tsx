import { App, message as staticMessage } from "antd";
import type { MessageInstance } from "antd/es/message/interface";
import { useEffect } from "react";

// Holder for the context-aware antd `message` instance, populated by the
// <MessageBridge /> mounted inside <App> below. The MutationCache lives
// outside React (the query client is created before the tree mounts), so
// non-React code that needs to toast goes through `getMessageApi()` instead
// of importing the static `message` from antd directly — that static import
// can't read the antd theme / locale context.
let bridged: MessageInstance | null = null;

export function setBridgedMessage(instance: MessageInstance | null) {
  bridged = instance;
}

export function getMessageApi(): MessageInstance {
  // Fall back to the static instance pre-mount so the very first tick isn't a
  // no-op.
  return bridged ?? (staticMessage as unknown as MessageInstance);
}

export function MessageBridge() {
  const { message } = App.useApp();
  useEffect(() => {
    setBridgedMessage(message);
    return () => setBridgedMessage(null);
  }, [message]);
  return null;
}
