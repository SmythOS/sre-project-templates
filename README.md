# @smythos/sdk Custom Component Template

## Overview

This template demonstrates a simple, practical way to create your own SmythOS component and use it in your agent via Smyth SDK interfece.

-   Write your component logic under `src/_sre.ext/core/Components/`.
-   Register your component in `src/_sre.ext/core/Components/index.ts`.
-   Generate the SDK interface using `npm run gen:components`.

The template comes with two custom components: `Repeat` and `Checksum`.

## Quickstart : Using the template

1. Install

```bash
npm install
```

2. Build

```bash
npm run build
```

3. Run

```bash
npm start
```

This will run the demo agent that calls two skills each of them invoke a custom component.

## How to create a custom component

### 1 - Implement the Component classd

Create a class in `src/_sre.ext/core/Components/` that extends `Component` and defines a basic `schema` and `process` method.
see [Repeat Component](./src/_sre.ext/core/Components/Repeat.class.ts) and [Checksum Component](./src/_sre.ext/core/Components/Checksum.class.ts) for examples.

```ts
export class MyNewComponent extends Component {
    protected schema = {
        name: 'MyNewComponent',
        settings: {
            // optional component settings
            // These settings will be set when you initilize your component, they cannot be changed at runtime.
            // Use them to initialize your component or determine the behavior of your component.
        },
        inputs: {
            // the inputs your component accepts
            // These inputs are received by the previous components in the workflow.
        },
        outputs: {
            // the outputs your component produces
        },
    };

    async process(input, settings, agent: Agent) {
        // implement your logic
        return { result: '...' };
    }
}
```

### 2 - Register the component

Register it in `src/_sre.ext/core/Components/index.ts`:

```ts
componentConnectorReq.register('MyNewComponent', new MyNewComponent());
```

### 3 - Build your project

```bash
npm run gen:components
```

> Note: The current template automatically regenerates the components if you run `npm run build`.

### 4 - Optional : Expose your components

You can expose your components through a barrel file or a named export

see [MyComponents.class.ts](./src/_sre.ext/sdk/Components/MyComponents.class.ts) for an example.

Exposing the generated components this way allows you to organize them in namespaces, it's especially useful if you have multiple custom components.

### Use Your Component in an Agent

In `src/index.ts`, instantiate your agent and call your component via `MyComponents`.

```ts
const agent = new Agent({ name: 'demo agent', model: 'gpt-4o', behavior: 'Demo' });

const mySkill = agent.addSkill({ name: 'mySkill', description: '...' });
mySkill.in({ text: { type: 'Text', description: 'Input text' } });

const myComp = MyComponents.MyNewComponent({
    /* optional settings */
});
myComp.in({ text: mySkill.out.body.text });

const result = await agent.prompt('Run my skill');
console.log(result);
```

### Example Components Included

-   Repeat

    -   Settings: `intro` (string, required), `times` (number, default 1)
    -   Inputs: `text` (string)
    -   Output: `result` (string)

-   Checksum
    -   Inputs: `data`, `format` (`hex` or `base64`), `algorithm` (`md5`, `sha1`, `sha256`, `sha512`)
    -   Output: `result` (string)

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
