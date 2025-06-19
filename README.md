# @smythos/sdk Minimal Code Agent Example

This project is a simple demonstration of the core capabilities of the [@smythos/sdk](https://www.npmjs.com/package/@smythos/sdk), showcasing how to build and interact with a basic AI agent in a Node.js environment. It features a "Storyteller" agent that runs directly and demonstrates several interaction patterns.

This project was bootstrapped with [SRE SDK Template : Branch code-agent-minimal](https://github.com/SmythOS/sre-project-templates/tree/code-agent-minimal).

## How it Works

The core of this application is a simple `Agent` instance created in `src/index.ts`. The script demonstrates four fundamental ways to interact with an agent:

1.  **Direct Skill Call**: Calling a predefined `greeting` skill on the agent.
2.  **Prompt**: Sending a prompt to the agent and waiting for the full response.
3.  **Streaming Prompt**: Sending a prompt and receiving the response as a stream of events.
4.  **Chat Interface**: Creating a non-persistent chat session to have a conversational interaction.

The example is designed to run from top to bottom, logging the output of each interaction type to the console.

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v20 or higher)
-   An API key for an OpenAI model (e.g., `gpt-4o-mini`).

### Installation

1.  Clone the repository:

    ```bash
    git clone --branch code-agent-minimal https://github.com/smythos/sre-project-templates.git simple-agent-example
    cd simple-agent-example
    ```

2.  Install the dependencies:

    ```bash
    npm install
    ```

3.  Set up your OpenAI API key:

    The application uses the [@smythos/sdk](https://www.npmjs.com/package/@smythos/sdk) which has a built-in secret management system called Smyth Vault.
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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
