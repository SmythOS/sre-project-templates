import { Component, Agent, Logger } from '@smythos/sre';

const logger = Logger('RepeatComponent');

export class Repeat extends Component {
    protected schema = {
        name: 'Repeat',
        settings: {
            intro: {
                type: 'string',
                description: 'The intro to repeat',
                required: true,
            },
            times: {
                type: 'number',
                description: 'The number of times to repeat the text',
                default: 1,
            },
        },

        inputs: {
            text: {
                type: 'string',
                description: 'The text to repeat',
            },
        },
        outputs: {
            result: {
                type: 'string',
            },
        },
    };

    async process(input, settings, agent: Agent) {
        const intro = settings.data.intro;
        const text = input.text;
        const times = settings.data.times;

        logger.debug(`Intro: ${intro}, Times: ${times}, Text: ${text}`);
        const result = intro + ' :: ' + Array(times).fill(text).join(' ');
        logger.debug(`Result: ${result}`);

        return { result };
    }
}
