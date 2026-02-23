# @SmythOS/sdk Minimal Code Agent Example

This project is a simple demonstration of the core capabilities of the [@SmythOS/sdk](https://www.npmjs.com/package/@SmythOS/sdk), showcasing how to build and interact with a basic AI agent in a Node.js environment. It features a "Storyteller" agent that runs directly and demonstrates several interaction patterns.

The project also demonstrates how to build a SEA executable for Windows, Linux, and macOS.

This project was bootstrapped with [SRE SDK Template : Branch code-agent-minimal-exe-bundle](https://github.com/SmythOS/sre-project-templates/tree/code-agent-minimal-exe-bundle).

## How it Works

The core of this application is a simple `Agent` instance created in `src/index.ts`. The script demonstrates four fundamental ways to interact with an agent:

1.  **Direct Skill Call**: Calling a predefined `greeting` skill on the agent.
2.  **Prompt**: Sending a prompt to the agent and waiting for the full response.
3.  **Streaming Prompt**: Sending a prompt and receiving the response as a stream of events.

The example is designed to run from top to bottom, logging the output of each interaction type to the console.

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v20 or higher)
-   An API key for an OpenAI model (e.g., `gpt-4o-mini`).

### Installation

1.  Clone the repository:

    ```bash
    git clone --branch code-agent-minimal-exe-bundle https://github.com/SmythOS/sre-project-templates.git simple-agent-example
    cd simple-agent-example
    ```

2.  Install the dependencies:

    ```bash
    npm install
    ```

3.  Set up your OpenAI API key:

    The application uses the [@SmythOS/sdk](https://www.npmjs.com/package/@SmythOS/sdk) which has a built-in secret management system called Smyth Vault.
    During development, we can use a simple json file to store vault secrets.

    Create a file in one of the following locations:

    -   `~/.smyth/.sre/vault.json` (user home directory : recommended)
    -   `./.smyth/.sre/vault.json` (local project directory)

    The file should have the following format:

    ```json
    {
        "default": {
            "openai": "sk-xxxxxx-Your-OpenAI-API-Key",
            "anthropic": "",
            "googleai": "",
            "groq": "",
            "togetherai": ""
        }
    }
    ```

    for this example code, only the **openai** key is needed, but you can pre-configure other models if you intend to use them.

    _Note: We are are preparing a CLI tool that will help you scaffold Smyth Projects and create/manage the vault._

### Running the Application

1.  Build the project:

    ```bash
    npm run build
    ```

2.  Run the script:

    ```bash
    npm start
    ```

    The application will execute `src/index.ts`, demonstrating the different agent interaction methods in your terminal.

### Building the SEA Executable for Windows, Linux, and macOS

1.  Build the project for the specific platform:

    ```bash
    npm run build:dev:exe:win # Windows
    npm run build:dev:exe:linux # Linux
    npm run build:dev:exe:macos # macOS
    ```

    The executable will be built in the `dist/exe` directory.

_Note: if you want to build for production just replace `build:dev` with `build:prod` in the commands above._

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
