/**
 * Redis key schema for the video conferencing state management.
 *
 * Key patterns:
 *   room:{roomId}             → Hash  (RedisRoomState serialized fields)
 *   room:{roomId}:participants → Hash  (userId → JSON<RoomParticipant>)
 *   socket:user:{socketId}    → String (userId)
 *   user:socket:{userId}      → String (socketId)
 *   active_rooms              → Set    (roomId[])
 *
 * TTLs:
 *   room:*                    → 24 h (auto-cleaned)
 *   socket:user:*             → 2 h
 *   user:socket:*             → 2 h
 */

const ROOM_TTL = 86400; // 24 hours
const SOCKET_TTL = 7200; // 2 hours

export const RedisKeys = {
  room: (roomId: string): string => `room:${roomId}`,
  roomParticipants: (roomId: string): string => `room:${roomId}:participants`,
  socketToUser: (socketId: string): string => `socket:user:${socketId}`,
  userToSocket: (userId: string): string => `user:socket:${userId}`,
  activeRooms: 'active_rooms',
  ROOM_TTL,
  SOCKET_TTL,
} as const;
