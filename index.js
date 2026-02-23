/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

import { polyfill as polyfillFetch } from 'react-native-polyfill-globals/src/fetch';
import { polyfill as polyfillReadableStream } from 'react-native-polyfill-globals/src/readable-stream';

const originalFetch = global.fetch;
polyfillFetch();
const streamingFetch = global.fetch;
global.fetch = originalFetch;
global.streamingFetch = streamingFetch;

polyfillReadableStream();

AppRegistry.registerComponent(appName, () => App);
