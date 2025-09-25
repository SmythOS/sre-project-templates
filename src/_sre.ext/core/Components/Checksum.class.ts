import { Component, Agent, Logger, ComponentInputType } from '@smythos/sre';
import crypto, { BinaryToTextEncoding } from 'crypto';
const logger = Logger('ChecksumComponent');

const algorithmsHandlers = {
    md5: (data: string, format: string) => {
        return crypto
            .createHash('md5')
            .update(data)
            .digest(format as BinaryToTextEncoding);
    },
    sha1: (data: string, format: string) => {
        return crypto
            .createHash('sha1')
            .update(data)
            .digest(format as BinaryToTextEncoding);
    },
    sha256: (data: string, format: string) => {
        return crypto
            .createHash('sha256')
            .update(data)
            .digest(format as BinaryToTextEncoding);
    },
    sha512: (data: string, format: string) => {
        return crypto
            .createHash('sha512')
            .update(data)
            .digest(format as BinaryToTextEncoding);
    },
};

export class Checksum extends Component {
    protected schema = {
        name: 'Checksum',
        settings: {},

        inputs: {
            data: {
                type: 'string',
                description: 'The data to calculate the checksum of',
            },
            format: {
                type: 'string',
                description: 'The format of the checksum, accepted values are hex and base64',
            },
            algorithm: {
                type: 'string',
                description: 'The algorithm to use to calculate the checksum, accepted values are md5, sha1, sha256 and sha512',
            },
        },
        outputs: {
            result: {
                type: 'string',
            },
        },
    };

    async process(input, settings, agent: Agent) {
        const algorithm = input.algorithm;
        const format = input.format;
        const data = input.data;

        logger.debug(`Algorithm: ${algorithm}, Format: ${format}, Data: ${data}`);

        const handler = algorithmsHandlers[algorithm];
        if (!handler) {
            logger.debug(`Algorithm ${algorithm} not supported`);
            return { result: '', error: `Algorithm ${algorithm} not supported`, _debug: logger.output };
        }

        let result;
        try {
            result = handler(data, format);
        } catch (error) {
            logger.debug(`Error calculating checksum: ${error}`);
            return { result: '', error: `Error calculating checksum: ${error.message}`, _debug: logger.output };
        }

        logger.debug(`Calculated checksum: ${result}`);

        return { result, _debug: logger.output };
    }
}
