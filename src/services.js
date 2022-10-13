import getApiClient from '@wazo/sdk/lib/service/getApiClient';

import { host } from './constants';

export const playNotification = () => {
  const audio = new Audio('/src/assets/sharp.wav');
  audio.play();
}

export const getWazoClient = () => {
  const client = getApiClient(host);
  client.setClientId('hackaton-2022-group-chat');

  // @todo refresh token mecanism

  return client;
}
