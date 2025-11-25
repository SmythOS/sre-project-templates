//IMPORTANT NOTE : Your API keys are configured in one of the following files :
//  .smyth/.sre/vault.json
//  ~/.smyth/.sre/vault.json

//Edit the vault.json file to update your API keys

import { Agent, TLLMEvent, Model, Scope } from '@smythos/sdk';
import { SRE } from '@smythos/sdk/core';
import chalk from 'chalk';

import path from 'path';
import { fileURLToPath } from 'url';

SRE.init({
    //Telemetry Service configuration
    Telemetry: {
        Connector: 'OTel', //we use OTel (OpenTelemetry) connector
        Settings: {
            endpoint: 'http://localhost:4318',

            //Optional settings
            //serviceName: 'smythos',
            //serviceVersion: '1.0.0',
            // headers: {
            //     'Authorization': 'Bearer your-api-key',
            // }
        },
    },
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
async function main() {
    //.smyth file path
    const agentPath = path.resolve(__dirname, './data', 'crypto-info-agent.smyth');

    //Importing the agent workflow
    const agent = Agent.import(agentPath, {
        model: Model.OpenAI('gpt-4o'),
    });

    const result = await agent.prompt('What are the current prices of Bitcoin and Ethereum ?');

    console.log(result);
}

main();
