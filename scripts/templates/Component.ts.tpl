import { Agent, createSafeAccessor, ComponentWrapper, ComponentInput } from '@smythos/sdk';

{{settingsType}}

{{inputsType}}

{{outputsType}}

{{componentJSDoc}}export function {{componentName}}(settings?: T{{componentName}}Settings, agent?: Agent) {        
    const dataObject: any = { 
        name: '{{componentName}}', 
        settings: {            
            ...settings
        }
    };
    const component = new ComponentWrapper(dataObject, agent);

    if (agent) {
        (agent.structure.components as ComponentWrapper[]).push(component);
    }
    
    const _out: T{{componentName}}Outputs = createSafeAccessor({
{{outputsCode}}
    }, component, '');

    const _in: { [key: string]: ComponentInput } = {
{{inputsCode}}
    };

    dataObject.outputs = _out;
    dataObject.inputs = _in;

    component.inputs(_in);

    const wrapper = {
        /** Component outputs - access via .out.OutputName */
        out: _out,        

        /** 
         * Create or Connect the component inputs 
         * if the input does not exist, it will be created
         * @examples 
         *    - component.in({ Input: source.out.data })
         *    - component.in({ Input: { type: 'string', source:source.out.data } })
         */        
        in: component.inputs.bind(component) as (inputs: T{{componentName}}Inputs) => void,
    };

    return wrapper;
}
