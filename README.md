# @smythos/sdk Empty Template

This project is an empty template to get started with [@smythos/sdk](https://www.npmjs.com/package/@smythos/sdk).

This project was bootstrapped with [SRE SDK Template : Branch sdk-empty](https://github.com/SmythOS/sre-project-templates/tree/sdk-empty).

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

### Implementing AI Agents

Read the [docs](https://smythos.github.io/sre/sdk/) to learn how to implement AI agents.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
