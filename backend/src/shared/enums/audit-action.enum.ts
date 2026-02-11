export enum AuditAction {
  ROOM_CREATED = 'room_created',
  ROOM_CLOSED = 'room_closed',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  USER_KICKED = 'user_kicked',
  USER_MUTED = 'user_muted',
  ALL_MUTED = 'all_muted',
  ROLE_CHANGED = 'role_changed',
  PRODUCER_CREATED = 'producer_created',
  PRODUCER_CLOSED = 'producer_closed',
  CONSUMER_CREATED = 'consumer_created',
  HAND_RAISE_TOGGLED = 'hand_raise_toggled',
}
