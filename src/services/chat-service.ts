import { BrowserWindow } from "electron";
import { TLLMEvent } from "@smythos/sdk";
import cryptoAgent from "../agents/crypto-agent";

class ChatService {
  private chat: any = null;
  private mainWindow: BrowserWindow | null = null;

  /**
   * Initialize the chat service with the main window
   */
  initialize(window: BrowserWindow): void {
    this.mainWindow = window;
    this.chat = cryptoAgent.chat();
  }

  /**
   * Handle incoming chat messages and stream responses
   */
  async handleMessage(message: string): Promise<void> {
    if (!this.mainWindow || !this.chat) {
      this.sendError("Chat service not initialized");
      return;
    }

    try {
      // Get the stream from the agent
      const streamResult = await this.chat.prompt(message).stream();

      // Listen for content events
      streamResult.on(TLLMEvent.Content, (content: string) => {
        this.sendEvent({
          type: "content",
          data: content,
        });
      });

      // Listen for tool call events
      streamResult.on(TLLMEvent.ToolCall, (toolCall: any) => {
        this.sendEvent({
          type: "toolCall",
          data: toolCall,
        });
      });

      // Listen for tool result events
      streamResult.on(TLLMEvent.ToolResult, (toolResult: any) => {
        this.sendEvent({
          type: "toolResult",
          data: toolResult,
        });
      });

      // Listen for end event
      streamResult.on(TLLMEvent.End, () => {
        this.sendEvent({
          type: "end",
        });
      });

      // Listen for error events
      streamResult.on(TLLMEvent.Error, (error: any) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.sendError(errorMessage);
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      this.sendError(errorMessage);
    }
  }

  /**
   * Send a stream event to the renderer process
   */
  private sendEvent(event: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("chat-stream-event", event);
    }
  }

  /**
   * Send an error event to the renderer process
   */
  private sendError(errorMessage: string): void {
    this.sendEvent({
      type: "error",
      data: errorMessage,
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.chat = null;
    this.mainWindow = null;
  }
}

export default ChatService;
