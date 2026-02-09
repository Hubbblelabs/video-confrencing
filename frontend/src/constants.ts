export const WS_EVENTS = {
  // Client → Server
  CREATE_ROOM: 'room:create',
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  CLOSE_ROOM: 'room:close',
  KICK_USER: 'room:kick',
  MUTE_ALL: 'room:muteAll',
  CHANGE_ROLE: 'room:changeRole',

  GET_ROUTER_CAPABILITIES: 'media:getRouterCapabilities',
  CREATE_TRANSPORT: 'media:createTransport',
  CONNECT_TRANSPORT: 'media:connectTransport',
  PRODUCE: 'media:produce',
  CONSUME: 'media:consume',
  RESUME_CONSUMER: 'media:resumeConsumer',
  CLOSE_PRODUCER: 'media:closeProducer',
  PAUSE_PRODUCER: 'media:pauseProducer',
  RESUME_PRODUCER: 'media:resumeProducer',

  // Server → Client
  AUTHENTICATED: 'authenticated',
  ROOM_CREATED: 'room:created',
  USER_JOINED: 'room:userJoined',
  USER_LEFT: 'room:userLeft',
  ROOM_CLOSED: 'room:closed',
  USER_KICKED: 'room:userKicked',
  ALL_MUTED: 'room:allMuted',
  ROLE_CHANGED: 'room:roleChanged',

  NEW_PRODUCER: 'media:newProducer',
  PRODUCER_CLOSED: 'media:producerClosed',

  ERROR: 'error',
} as const;

export const API_BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000';
export const WS_URL = import.meta.env['VITE_WS_URL'] ?? 'http://localhost:3000';
