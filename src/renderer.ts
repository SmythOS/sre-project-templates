import { ipcRenderer } from "electron";

interface StreamEvent {
  type: "content" | "toolCall" | "toolResult" | "end" | "error";
  data?: any;
}

let currentAssistantMessage: HTMLDivElement | null = null;
let isWaitingForResponse = false;
// Store tool call containers by their ID for associating results
const toolCallContainers = new Map<string, HTMLElement>();

document.addEventListener("DOMContentLoaded", () => {
  const messageInput = document.getElementById(
    "messageInput"
  ) as HTMLTextAreaElement;
  const sendBtn = document.getElementById("sendBtn") as HTMLButtonElement;
  const chatContainer = document.getElementById(
    "chatContainer"
  ) as HTMLDivElement;
  const closeBtn = document.getElementById("closeBtn") as HTMLButtonElement;

  // Handle close button click
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      ipcRenderer.send("close-window");
    });
  }

  // Handle send button click
  sendBtn.addEventListener("click", () => {
    sendMessage();
  });

  // Handle Enter key press
  messageInput.addEventListener("keypress", (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Listen for stream events from main process
  ipcRenderer.on("chat-stream-event", (_event, streamEvent: StreamEvent) => {
    handleStreamEvent(streamEvent);
  });

  function sendMessage(): void {
    const message = messageInput.value.trim();

    if (!message || isWaitingForResponse) {
      return;
    }

    // Add user message to chat
    addUserMessage(message);

    // Clear input
    messageInput.value = "";

    // Disable input while waiting for response
    isWaitingForResponse = true;
    sendBtn.disabled = true;
    messageInput.disabled = true;

    // Show typing indicator
    showTypingIndicator();

    // Send message to main process
    ipcRenderer.send("chat-message", message);
  }

  function handleStreamEvent(event: StreamEvent): void {
    switch (event.type) {
      case "content":
        hideTypingIndicator();
        appendAssistantContent(event.data);
        break;

      case "toolCall":
        hideTypingIndicator();
        // Finalize current message bubble before showing tool call
        // This ensures subsequent content creates a new bubble
        finalizeAssistantMessage();
        addToolCallMessage(event.data);
        break;

      case "toolResult":
        addToolResultMessage(event.data);
        break;

      case "end":
        hideTypingIndicator();
        finalizeAssistantMessage();
        // Re-enable input
        isWaitingForResponse = false;
        sendBtn.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
        break;

      case "error":
        hideTypingIndicator();
        addErrorMessage(event.data);
        // Re-enable input
        isWaitingForResponse = false;
        sendBtn.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
        break;
    }

    // Scroll to bottom
    scrollToBottom();
  }

  function addUserMessage(message: string): void {
    const messageDiv = document.createElement("div");
    messageDiv.className = "message user";

    const label = document.createElement("span");
    label.className = "message-label";
    label.textContent = "You";

    const content = document.createElement("div");
    content.className = "message-content";
    content.textContent = message;

    messageDiv.appendChild(label);
    messageDiv.appendChild(content);
    chatContainer.appendChild(messageDiv);

    scrollToBottom();
  }

  function appendAssistantContent(content: string): void {
    if (!currentAssistantMessage) {
      // Create new assistant message
      const messageDiv = document.createElement("div");
      messageDiv.className = "message assistant";

      const label = document.createElement("span");
      label.className = "message-label";
      label.textContent = "Assistant";

      const contentDiv = document.createElement("div");
      contentDiv.className = "message-content";
      contentDiv.textContent = content;

      messageDiv.appendChild(label);
      messageDiv.appendChild(contentDiv);
      chatContainer.appendChild(messageDiv);

      currentAssistantMessage = contentDiv;
    } else {
      // Append to existing message
      currentAssistantMessage.textContent += content;
    }
  }

  function finalizeAssistantMessage(): void {
    currentAssistantMessage = null;
  }

  function addToolCallMessage(toolCall: any): void {
    const toolId = toolCall?.tool?.id || `tool-${Date.now()}`;
    const toolName = toolCall?.tool?.name || "Unknown Tool";
    const toolArgs =
      typeof toolCall?.tool?.arguments === "object"
        ? JSON.stringify(toolCall?.tool?.arguments)
        : toolCall?.tool?.arguments || "";

    // Create container for tool call and result
    const container = document.createElement("div");
    container.className = "tool-container";
    container.dataset.toolId = toolId;

    // Create collapsible header
    const header = document.createElement("div");
    header.className = "tool-header";

    const toggleIcon = document.createElement("span");
    toggleIcon.className = "tool-toggle";
    toggleIcon.textContent = ">";

    const toolTitle = document.createElement("span");
    toolTitle.className = "tool-title";
    toolTitle.textContent = `🔧 Skill Use: ${toolName}`;

    header.appendChild(toggleIcon);
    header.appendChild(toolTitle);

    // Create content area (for arguments and result)
    const content = document.createElement("div");
    content.className = "tool-content";

    // Add arguments if present
    if (toolArgs) {
      const argsDiv = document.createElement("div");
      argsDiv.className = "tool-arguments";
      argsDiv.textContent = `Arguments: ${toolArgs}`;
      content.appendChild(argsDiv);
    }

    // Create result placeholder
    const resultDiv = document.createElement("div");
    resultDiv.className = "tool-result-container";
    resultDiv.textContent = "⏳ Waiting for result...";
    content.appendChild(resultDiv);

    // Add click handler for collapse/expand
    header.addEventListener("click", () => {
      container.classList.toggle("collapsed");
    });

    container.appendChild(header);
    container.appendChild(content);
    chatContainer.appendChild(container);

    // Store reference for later
    toolCallContainers.set(toolId, resultDiv);

    scrollToBottom();
  }

  function addToolResultMessage(toolResult: any): void {
    const toolId = toolResult?.tool?.id;
    const resultText =
      typeof toolResult?.result === "object"
        ? JSON.stringify(toolResult?.result, null, 2)
        : String(toolResult?.result || "");

    // Find the corresponding tool call container
    const resultContainer = toolId ? toolCallContainers.get(toolId) : null;

    if (resultContainer) {
      // Update the existing placeholder
      resultContainer.className = "tool-result-content";
      resultContainer.textContent = `✓ Result: ${resultText}`;

      // Find the parent tool container
      const toolContainer = resultContainer.closest(".tool-container");

      // Auto-collapse after 3 seconds
      if (toolContainer) {
        setTimeout(() => {
          toolContainer.classList.add("collapsed");
        }, 3000);
      }

      toolCallContainers.delete(toolId); // Clean up
    } else {
      // Fallback: create standalone result if no matching call found
      const resultDiv = document.createElement("div");
      resultDiv.className = "tool-result-standalone";
      resultDiv.textContent = `✓ Result: ${resultText}`;
      chatContainer.appendChild(resultDiv);
    }

    scrollToBottom();
  }

  function addErrorMessage(error: string): void {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = `❌ Error: ${error}`;

    chatContainer.appendChild(errorDiv);
    scrollToBottom();
  }

  function showTypingIndicator(): void {
    // Remove existing typing indicator if any
    hideTypingIndicator();

    const indicator = document.createElement("div");
    indicator.className = "typing-indicator active";
    indicator.id = "typingIndicator";

    const dots = document.createElement("div");
    dots.className = "typing-dots";

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("span");
      dots.appendChild(dot);
    }

    indicator.appendChild(dots);
    chatContainer.appendChild(indicator);
    scrollToBottom();
  }

  function hideTypingIndicator(): void {
    const indicator = document.getElementById("typingIndicator");
    if (indicator) {
      indicator.remove();
    }
  }

  function scrollToBottom(): void {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Focus on input when app loads
  messageInput.focus();

  // Setup resize handles
  setupResizeHandles();
});

function setupResizeHandles(): void {
  const resizeHandles = document.querySelectorAll(".resize-handle");
  console.log("Found resize handles:", resizeHandles.length);

  resizeHandles.forEach((handle) => {
    handle.addEventListener("mousedown", (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const direction = (handle as HTMLElement).dataset.direction;

      console.log("Resize started:", direction);

      if (!direction) return;

      const startX = (e as MouseEvent).screenX;
      const startY = (e as MouseEvent).screenY;

      // Get initial window bounds
      ipcRenderer.send("start-resize", { direction, startX, startY });

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.screenX - startX;
        const deltaY = moveEvent.screenY - startY;

        ipcRenderer.send("resize-window", { direction, deltaX, deltaY });
      };

      const handleMouseUp = () => {
        console.log("Resize ended:", direction);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    });
  });
}
