// utils/APIRoutes.js
// Auth
export const loginRoute          = `/api/auth/login`;
export const registerRoute       = `/api/auth/register`;
export const logoutRoute         = `/api/auth/logout`;
export const allUsersRoute       = `/api/auth/allusers`;
export const setAvatarRoute      = `/api/auth/setavatar`;
export const uploadKeyRoute      = `/api/auth/uploadkey`;
export const heartbeatRoute      = `/api/auth/heartbeat`;

// Messages
export const sendMessageRoute    = `/api/messages/addmsg`;
export const recieveMessageRoute = `/api/messages/getmsg`;
export const unreadCountsRoute   = `/api/messages/unread`;

// Friends
export const searchUsersRoute         = `/api/friends/search`;
export const recommendedUsersRoute    = `/api/friends/recommended`;
export const friendRequestsRoute      = `/api/friends/requests`;
export const sendFriendRequestRoute   = `/api/friends/send-request`;
export const acceptFriendRequestRoute = `/api/friends/accept`;
export const rejectFriendRequestRoute = `/api/friends/reject`;

// Calls
export const callOfferRoute      = `/api/calls/offer`;
export const callAnswerRoute     = `/api/calls/answer`;
export const callCandidateRoute  = `/api/calls/candidate`;
export const callIncomingRoute   = `/api/calls/incoming`;
export const callStatusRoute     = `/api/calls/status`;   // + /:callId
export const callCandidatesRoute = `/api/calls/candidates`; // + /:callId
export const callEndRoute        = `/api/calls/end`;
