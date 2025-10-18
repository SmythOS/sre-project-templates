# Crypto Chat Assistant - Electron App (TypeScript + Rollup)

A modern Electron Demo App, built with TypeScript and bundled with Rollup, featuring a chat interface powered by SmythOS SDK for cryptocurrency price tracking.



https://github.com/user-attachments/assets/5b0e1faa-ee93-4f94-bafc-1e59e1445d45



## Project Structure

```
./
├── src/
│   ├── main.ts                # Main process (TypeScript) - Application entry
│   ├── renderer.ts            # Renderer process (TypeScript) - UI logic
│   ├── services/
│   │   └── chat-service.ts    # Chat service - Handles streaming & events
│   └── agents/
│       └── crypto-agent.ts    # SmythOS crypto assistant agent
├── dist/                      # Compiled JavaScript output (generated)
├── index.html                 # Main HTML file (chat interface)
├── package.json               # Project dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── rollup.config.js           # Rollup bundler configuration
```

## Prerequisites

- Node.js (v20 or higher)
- npm or yarn
- OpenAI API key (the SDK will use Smyth Vault to fetch it)

## Installation

```bash
npm install
```

## Development

### Build TypeScript files

Compile TypeScript and bundle with Rollup:

```bash
npm run build
```

### Watch mode

Automatically rebuild on file changes:

```bash
npm run watch
```

### Run the app

Start the Electron application (without DevTools):

```bash
npm run build
npm start
```

Or in development mode (with DevTools):

```bash
npm run watch   # terminal 1
npm run dev     # terminal 2
```

**Note:**

> @smythos/sdk is installed as a devDependency because we use rollup to bundle, do not install it as a dependency

## Building for Production

### Create executable files

```bash
npm run build:exe:win     # Windows
npm run build:exe:mac     # macOS
npm run build:exe:linux   # Linux
```

### Create distributable packages

```bash
npm run dist
```

## Scripts

- `npm start` - Run the Electron app (without DevTools)
- `npm run dev` - Run Electron with DevTools (use `npm run watch` to rebuild)
- `npm run build` - Bundle TypeScript with Rollup
- `npm run watch` - Watch mode for development
- `npm run build:exe:win` - Compile TypeScript and bundle with Rollup for Windows
- `npm run build:exe:mac` - Compile TypeScript and bundle with Rollup for macOS
- `npm run build:exe:linux` - Compile TypeScript and bundle with Rollup for Linux
- `npm run dist` - Create distributable packages
- `npm run pack` - Create unpacked directory-only build
- `npm run clean` - Remove dist and build directories

## Implementation Details

### Stream Mode Chat

The chat interface implements real-time streaming using the SmythOS SDK's event system:

**Main Process** (`src/main.ts`):

- Creates the Electron window and sets up the application lifecycle
- Initializes the chat service with the browser window
- Listens for `chat-message` IPC events and delegates to chat service
- Cleans up resources when the window closes

**Chat Service** (`src/services/chat-service.ts`):

- Singleton service that manages the AI agent and chat instance
- Handles incoming messages and initiates streaming responses
- Listens for SmythOS SDK events:
  - `TLLMEvent.Content` - Streams text content as it's generated
  - `TLLMEvent.ToolCall` - Notifies when a tool is being called
  - `TLLMEvent.ToolResult` - Shows the result from tool execution
  - `TLLMEvent.End` - Signals completion of the response
  - `TLLMEvent.Error` - Handles any errors
- Forwards all events to the renderer via `webContents.send()`
- Provides clean initialization and cleanup methods

**Renderer Process** (`src/renderer.ts`):

- Sends user messages via IPC to the main process
- Listens for `chat-stream-event` events from the main process
- Updates the UI progressively as chunks arrive:
  - Appends content chunks to create a streaming text effect
  - Displays tool calls with yellow badges
  - Shows tool results with green badges
  - Handles errors and completion states
- Provides a smooth chat experience with typing indicators

**Agent Configuration** (`src/agents/crypto-agent.ts`):

- Defines the crypto assistant with GPT-4o model
- Implements a Price skill that fetches data from CoinGecko
- The agent automatically decides when to use the skill based on user queries

### IPC Communication Flow

```
User types message
    ↓
Renderer: ipcRenderer.send('chat-message', message)
    ↓
Main: Receives IPC event, delegates to chatService.handleMessage()
    ↓
ChatService: Calls agent.chat().prompt(message).stream()
    ↓
ChatService: Listens to TLLMEvent events
    ↓
ChatService: Forwards events via webContents.send('chat-stream-event', event)
    ↓
Renderer: Receives events, updates UI progressively
```

## License

MIT
