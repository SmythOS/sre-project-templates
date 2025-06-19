//This agent is implemented in BookAssistant.agent.ts
import BookAssistantAgent from './agents/BookAssistant.agent';

//This agent is implemented in CryptoAssistant.agent.ts
import CryptoAssistantAgent from './agents/CryptoAssistant.agent';

//a helper function to run a chat session in the terminal
import { runChat } from './utils/TerminalChat';

import inquirer from 'inquirer';

//In this example we wanted to demo something cooler
//We are using inquirer to ask the user which agent they want to chat with
//then we start a chat session with the selected agent

//Below main() function you can find other ways to interact with the agent
const main = async () => {
    const { agentChoice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'agentChoice',
            message: 'Use arrow keys to select an agent and press enter to start the chat',
            choices: ['Book Assistant', 'Crypto Assistant'],
        },
    ]);

    //Select the agent based on the user's choice
    let agent;
    if (agentChoice === 'Book Assistant') {
        agent = BookAssistantAgent;
    } else {
        agent = CryptoAssistantAgent;
    }

    //Create a chat object from the agent

    //this is used to identify the chat session, using the same ID will load the previous chat session
    const sessionId = `my-chat-session-${agentChoice.replace(' ', '-')}`;
    const chat = agent.chat({
        id: sessionId,
        persist: true,
    });

    //Run the chat session in the terminal
    runChat(chat);
};

main();

//Below you can find other ways to interact with the agent

//1. call a skill directly
// const result = await BookAssistantAgent.call('get_book_info', {
//     book_name: 'The Black Swan',
// });
// console.log(result);

//2. prompt
//const result = await BookAssistantAgent.prompt('Who is the author of the book "The Black Swan"?');
//console.log(result);

//3. prompt and stream response
// const stream = await BookAssistantAgent.prompt('Who is the author of the book "The Black Swan"?').stream();
// stream.on(TLLMEvent.Content, (content) => {
//     console.log(content);
// });
