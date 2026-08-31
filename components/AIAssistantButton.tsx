"use client";

// components/AIAssistantButton.tsx — navbar trigger for the AI
// Shopping Assistant, placed directly beside the search field (see
// Navbar.tsx) since search and AI shopping assistance are both
// discovery features. Only subscribes to AIAssistantUIContext (open/
// toggle), not the chat context — so this button does NOT re-render
// on every streamed token while a conversation is in progress
// elsewhere in the tree.
import { Sparkles } from "lucide-react";
import { useAIAssistantUI } from "@/context/AIAssistantContext";
import styles from "./AIAssistantButton.module.css";

export default function AIAssistantButton() {
  const { open, toggle, triggerRef } = useAIAssistantUI();

  return (
    <button
      ref={triggerRef}
      type="button"
      className={styles.trigger}
      onClick={toggle}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-controls="ai-assistant-panel"
    >
      <Sparkles size={18} aria-hidden="true" />
      <span className={styles.label}>AI Assistant</span>
    </button>
  );
}
