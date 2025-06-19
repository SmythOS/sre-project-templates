# @smythos/sdk Book Assistant Example

This project is a demonstration of the capabilities of the [@smythos/sdk](https://www.npmjs.com/package/@smythos/sdk), showcasing how to build and interact with an AI agent in a Node.js environment. It features a command-line interface (CLI) that allows you to chat with a **Book Assistant** agent.

This project was bootstrapped with [SRE SDK Template](https://github.com/smythos/sre-sdk-template).

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v20 or higher)
-   An API key for an OpenAI model (e.g., `gpt-4o`).

### Installation

1.  Clone the repository:

    ```bash
    git clone --branch code-agent-book-assistant https://github.com/smythos/sre-project-templates.git book-assistant-example
    cd book-assistant-example
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

2.  Start the interactive chat:
    ```bash
    npm start
    ```

## Example Interactions

**Indexing a file:**

```
You: please index this book ./data/bitcoin.pdf

[Calling Tool] index_book {"0":{"book_path":"./data/bitcoin.pdf"}}
🤖 Assistant: The book "bitcoin.pdf" has been indexed successfully. If you have any queries or need further assistance, feel free to ask!
```

**Querying the indexed file:**

```
You: find the pages that discuss the concept of Proof of work

[Calling Tool] lookup_book {"0":{"user_query":"Proof of work"}}
🤖 Assistant: The concept of Proof of Work is discussed on multiple pages in the "bitcoin.pdf" document. Here are some excerpts and the corresponding page numbers where this concept is covered:

1. **Page 3**:
   - "The proof-of-work also solves ...."

2. **Page 8**:
   - "To solve this, we proposed a peer-to-peer...."

3. **Page 1**:
   - "Nodes can leave and rejoin the network at will, ...."

These excerpts explain how the Proof of Work mechanism is implemented in the Bitcoin network to ensure the security and integrity of the blockchain. If you have any more questions or need further details, feel free to ask!
```

**Getting book information from an external API:**

```
You: Provide me with all the information about the book The black Swan

[Calling Tool] get_book_info {"0":{"book_name":"The Black Swan"}}
🤖 Assistant: "The Black Swan: The Impact of the Highly Improbable" is a book written by Nassim Nicholas Taleb. Here's some detailed information about the book:

- **Author**: Nassim Nicholas Taleb
- **Subtitle**: The Impact of the Highly Improbable
- **First Published**: 2005
- **Editions**: There are 27 editions of the book.
- **Languages Available**: The book is available in multiple languages, including English, Portuguese, Japanese, Korean, French, German, Hebrew, and Spanish.

- **Cover Edition Key**: OL17969527M
- **Cover Image**: ![The Black Swan Cover](https://covers.openlibrary.org/b/id/5721840-L.jpg)

- **Internet Archive (IA) Access**:
  - The book has several listings on the Internet Archive for borrowing or reading, such as:
    - [blackswan0000tale](https://archive.org/details/blackswan0000tale)
    - [blackswanimpacto00tale](https://archive.org/details/blackswanimpacto00tale)

- **Ebook Access**: The book is available in the "printdisabled" category, meaning there are specific access restrictions for the digitally impaired.
- **IA Collection**: The book can be found in collections such as americana, printdisabled, and various university libraries.

**Summary**:
"The Black Swan" explores the impact of rare, unpredictable events, termed "black swans," and the human tendency to find simplistic explanations for these events retrospectively. Taleb argues that these events have significant effects on history and markets, emphasizing the limitations of our predictions and the biases that cloud our judgment.

If you seek more specific information or wish to access the book, feel free to let me know!
```

### Other Interaction Methods

The `src/index.ts` file contains commented-out examples of other ways to interact with the agents besides the interactive chat. You can uncomment them to see how to:

-   Call a specific skill directly.
-   Send a single prompt to an agent.
-   Stream the agent's response to a prompt.

## Features

-   **Persistent Chat Sessions**: Chat history is saved and restored, allowing you to continue previous conversations.
-   **Book Assistant**: An agent created programmatically with skills to:
    -   Index books from local files into an in-memory vector database.
    -   Search for indexed books based on your queries.
    -   Fetch book information from the [Open Library API](https://openlibrary.org/developers/api).
-   **Multiple Interaction Models**: Demonstrates different ways to interact with the agent, including direct skill calls, prompting, and streaming responses.

## How it Works

The core of this application is the `BookAssistantAgent`, which is an instance of the `Agent` class from the `@smythos/sdk`.

This agent is defined entirely in code in `src/agents/BookAssistant.agent.ts`. It demonstrates how to:

-   Create an agent instance.
-   Define its behavior and link it to a language model.
-   Create an in-memory vector database (`RAMVec`) for data storage and retrieval.
-   Add custom skills with programmatic logic (`index_book`, `lookup_book`, `get_book_info`).

## Project Structure

```
.
├── data
│   └── bitcoin.pdf             # Example file for indexing
├── dist
│   └── ...                     # Compiled JavaScript files
├── src
│   ├── agents
│   │   └── BookAssistant.agent.ts   # Programmatic agent definition
│   ├── utils
│   │   └── TerminalChat.ts     # Helper for terminal chat UI
│   └── index.ts                # Main application entry point
├── package.json
└── README.md
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
