// src/utils/APIRoutes.js
export const host = process.env.REACT_APP_BACKEND_URL;

// Auth routes
export const loginRoute         = `${host}/api/auth/login`;
export const registerRoute      = `${host}/api/auth/register`;
export const logoutRoute        = `${host}/api/auth/logout`;
export const allUsersRoute      = `${host}/api/auth/allusers`;
export const setAvatarRoute     = `${host}/api/auth/setavatar`;
export const uploadKeyRoute     = `${host}/api/auth/uploadkey`;   // E2E: upload public key
export const heartbeatRoute     = `${host}/api/auth/heartbeat`;   // Online status

// Message routes
export const sendMessageRoute    = `${host}/api/messages/addmsg`;
export const recieveMessageRoute = `${host}/api/messages/getmsg`;
export const unreadCountsRoute   = `${host}/api/messages/unread`; // Notification badges

// Friend system routes
export const searchUsersRoute        = `${host}/api/friends/search`;
export const recommendedUsersRoute   = `${host}/api/friends/recommended`;
export const friendRequestsRoute     = `${host}/api/friends/requests`;
export const sendFriendRequestRoute  = `${host}/api/friends/send-request`;
export const acceptFriendRequestRoute = `${host}/api/friends/accept`;
export const rejectFriendRequestRoute = `${host}/api/friends/reject`;
