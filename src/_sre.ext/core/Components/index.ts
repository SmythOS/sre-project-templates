import { AccessCandidate, ComponentConnector, ConnectorService, SRE } from '@smythos/sre';
import { Repeat } from './Repeat.class';
import { Checksum } from './Checksum.class';

export async function registerComponents() {
    //Wait for SRE to be ready
    await SRE.ready();

    //Get the components connector service
    const componentConnector = ConnectorService.getComponentConnector() as ComponentConnector;
    //Request system access level
    const componentConnectorReq = componentConnector.requester(AccessCandidate.user('system'));

    //register the custom components
    componentConnectorReq.register('Repeat', new Repeat());
    componentConnectorReq.register('Checksum', new Checksum());
}
