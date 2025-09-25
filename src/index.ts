import { Agent } from '@smythos/sdk';
import { MyComponents } from './_sre.ext/sdk/Components/MyComponents.class';

async function main() {
    const agent = new Agent({
        name: 'demo agent',
        model: 'gpt-4o',
        behavior: `Demo agent`,
    });

    // The first skill uses our custom Repeat component
    const repeatSkill = agent.addSkill({
        name: 'repeat',
        description: 'Calls the Repeat component',
    });
    repeatSkill.in({
        text: {
            type: 'Text',
            description: 'The text to repeat',
        },
    });

    const repeatComponent = MyComponents.Repeat({
        intro: '$$$$',
        times: 3,
    });

    repeatComponent.in({
        text: repeatSkill.out.body.text,
    });

    // The second skill uses our custom Checksum component
    const checksumSkill = agent.addSkill({
        name: 'checksum',
        description: 'calculate the checksum of the text',
    });
    checksumSkill.in({
        data: {
            type: 'Text',
            description: 'the data to calculate the checksum of',
        },
        format: {
            type: 'Text',
            description: 'the format of the checksum, accepted values are hex and base64',
        },
        algorithm: {
            type: 'Text',
            description: 'the algorithm to use to calculate the checksum, accepted values are md5, sha1, sha256 and sha512',
        },
    });

    const checksumComponent = MyComponents.Checksum();
    checksumComponent.in({
        data: checksumSkill.out.body.data,
        format: checksumSkill.out.body.format,
        algorithm: checksumSkill.out.body.algorithm,
    });

    console.log(' === Testing Repeat component ===');
    const result1 = await agent.prompt('Repeat the text "hello smythos", return the exact output returned by the tool call');

    console.log(result1);

    console.log('\n\n =========================== \n');

    console.log(' === Testing Checksum component ===');
    const result2 = await agent.prompt('generate an md5 checksum of the text "hello" in base64');
    console.log(result2);
}

main();
