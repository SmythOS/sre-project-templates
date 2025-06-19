import { Agent, Doc, Model } from '@smythos/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * This is an example of a simple agent where the skills are implemented programmatically
 *
 */

const __dirname = process.cwd();
const BOOKS_NAMESPACE = 'books';

//#region [ Agent Instance] ===================================

//We create the agent instance
const agent = new Agent({
    id: 'book-assistant', //<=== agent id is important for data isolation in vector DBs and Storage

    //the name of the agent, this is how the agent will identify itself
    name: 'Book Assistant',

    //here we are using a builtin model
    //note that we are not passing an apiKey because we will rely on smyth vault for the model credentials
    model: 'gpt-4o',

    //the behavior of the agent, this describes the personnality and behavior of the agent
    behavior: 'You are a helpful assistant that can answer questions about the books.',
});

//We create a vectorDB instance, at the agent scope
//RAMVec is a minimal in memory vectorDB, we mostly use it for testing and development
//In production we will use a more robust vectorDB like Pinecone or Milvus
const ramvec = agent.vectorDB.RAMVec(BOOKS_NAMESPACE, {
    embeddings: Model.OpenAI('text-embedding-3-small'),
});

//#endregion

//#region [ Skills ] ===================================

//Index a book in RAMVec vector database
agent.addSkill({
    name: 'index_book',
    description: 'Use this skill to index a book in a vector database, the user will provide the path to the book',
    process: async ({ book_path }) => {
        const filePath = path.resolve(__dirname, book_path);
        if (!fs.existsSync(filePath)) {
            return `File resolved path to ${filePath} does not exist`;
        }

        const parsedDoc = await Doc.auto.parse(filePath);

        const name = path.basename(filePath);
        const result = await ramvec.insertDoc(name, parsedDoc);

        if (result) {
            return `Book ${name} indexed successfully`;
        } else {
            return `Book ${name} indexing failed`;
        }
    },
});

//Lookup a book in RAMVec vector database
agent.addSkill({
    name: 'lookup_book',
    description: 'Use this skill to lookup a book in the vector database',
    process: async ({ user_query }) => {
        const result = await ramvec.search(user_query, {
            topK: 5,
        });
        return result;
    },
});

//Openlibrary lookup : this is a simple skill that uses the openlibrary API to get information about a book
const openlibraryLookupSkill = agent.addSkill({
    name: 'get_book_info',
    description: 'Use this skill to get information about a book',
    process: async ({ book_name }) => {
        const url = `https://openlibrary.org/search.json?q=${book_name}`;

        const response = await fetch(url);
        const data = await response.json();

        return data.docs[0];
    },
});

//The skill that we just created requires a book_name input,
// sometime the agent LLM will need a description or more details about the input in order to use it properly
//below we add a description to the book_name input in order to tell the LLM how to use it
openlibraryLookupSkill.in({
    book_name: {
        description: 'This need to be a name of a book, extract it from the user query',
    },
});

//#endregion

export default agent;
