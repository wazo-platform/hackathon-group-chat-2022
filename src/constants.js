const urlParams = new URLSearchParams(window.location.search);

export const host = urlParams.get('host');
export const username = urlParams.get('username');
export const password = urlParams.get('password');

export const PICKET_TYPE_GLOBAL = 'global';
export const PICKET_TYPE_REACTION = 'reaction';
