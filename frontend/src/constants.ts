export const WS_EVENTS = {
  // Client → Server
  CREATE_ROOM: 'room:create',
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  CLOSE_ROOM: 'room:close',
  KICK_USER: 'room:kick',
  MUTE_ALL: 'room:muteAll',
  CHANGE_ROLE: 'room:changeRole',
  HAND_RAISE: 'room:handRaise',
  REACTION: 'room:reaction',

  GET_ROUTER_CAPABILITIES: 'media:getRouterCapabilities',
  CREATE_TRANSPORT: 'media:createTransport',
  CONNECT_TRANSPORT: 'media:connectTransport',
  PRODUCE: 'media:produce',
  CONSUME: 'media:consume',
  RESUME_CONSUMER: 'media:resumeConsumer',
  CLOSE_PRODUCER: 'media:closeProducer',
  PAUSE_PRODUCER: 'media:pauseProducer',
  RESUME_PRODUCER: 'media:resumeProducer',

  // Whiteboard
  WHITEBOARD_DRAW: 'whiteboard:draw',
  WHITEBOARD_CLEAR: 'whiteboard:clear',
  WHITEBOARD_UNDO: 'whiteboard:undo',
  WHITEBOARD_CURSOR: 'whiteboard:cursor',
  WHITEBOARD_OBJECT_ADDED: 'whiteboard:objectAdded',
  WHITEBOARD_OBJECT_MODIFIED: 'whiteboard:objectModified',
  WHITEBOARD_OBJECT_REMOVED: 'whiteboard:objectRemoved',
  WHITEBOARD_LOAD: 'whiteboard:load',
  WHITEBOARD_STATE: 'whiteboard:state',

  // Chat
  CHAT_MESSAGE: 'chat:message',
  CHAT_PRIVATE_MESSAGE: 'chat:privateMessage',
  CHAT_FILE_UPLOAD: 'chat:fileUpload',
  CHAT_TYPING: 'chat:typing',
  CHAT_HISTORY: 'chat:history',
  CHAT_MESSAGE_RECEIVED: 'chat:messageReceived',
  CHAT_PRIVATE_MESSAGE_RECEIVED: 'chat:privateMessageReceived',
  CHAT_FILE_RECEIVED: 'chat:fileReceived',
  CHAT_USER_TYPING: 'chat:userTyping',

  // Waiting Room
  JOIN_WAITING_ROOM: 'waitingRoom:join',
  ADMIT_PARTICIPANT: 'waitingRoom:admit',
  REJECT_PARTICIPANT: 'waitingRoom:reject',
  ADMIT_ALL: 'waitingRoom:admitAll',
  WAITING_PARTICIPANT_JOINED: 'waitingRoom:participantJoined',
  PARTICIPANT_ADMITTED: 'waitingRoom:participantAdmitted',
  PARTICIPANT_REJECTED: 'waitingRoom:participantRejected',
  WAITING_ROOM_UPDATED: 'waitingRoom:updated',

  // Server → Client
  AUTHENTICATED: 'authenticated',
  ROOM_CREATED: 'room:created',
  USER_JOINED: 'room:userJoined',
  USER_LEFT: 'room:userLeft',
  ROOM_CLOSED: 'room:closed',
  USER_KICKED: 'room:userKicked',
  ALL_MUTED: 'room:allMuted',
  ROLE_CHANGED: 'room:roleChanged',
  HAND_RAISED: 'room:handRaised',
  REACTION_RECEIVED: 'room:reactionReceived',

  NEW_PRODUCER: 'media:newProducer',
  PRODUCER_CLOSED: 'media:producerClosed',
  PRODUCER_PAUSED: 'media:producerPaused',
  PRODUCER_RESUMED: 'media:producerResumed',

  ERROR: 'error',
} as const;

export const API_BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000';
export const WS_URL = import.meta.env['VITE_WS_URL'] ?? 'http://localhost:3000';
