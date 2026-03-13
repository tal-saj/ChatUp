// src/utils/APIRoutes.js

// Use environment variable if available (for production), fallback to localhost for dev
export const host = process.env.REACT_APP_BACKEND_URL;

// Auth routes
export const loginRoute    = `${host}/api/auth/login`;
export const registerRoute = `${host}/api/auth/register`;
export const logoutRoute   = `${host}/api/auth/logout`;
export const allUsersRoute = `${host}/api/auth/allusers`;
export const setAvatarRoute = `${host}/api/auth/setavatar`;

// Message routes
export const sendMessageRoute    = `${host}/api/messages/addmsg`;
export const recieveMessageRoute = `${host}/api/messages/getmsg`;


// ⭐ FRIEND SYSTEM ROUTES

// search users
export const searchUsersRoute = `${host}/api/friends/search`;

// recommended friends
export const recommendedUsersRoute = `${host}/api/friends/recommended`;

// get incoming friend requests
export const friendRequestsRoute = `${host}/api/friends/requests`;

// send friend request
export const sendFriendRequestRoute = `${host}/api/friends/send-request`;

// accept friend request
export const acceptFriendRequestRoute = `${host}/api/friends/accept`;

// reject friend request
export const rejectFriendRequestRoute = `${host}/api/friends/reject`;