// FriendsPage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Import API routes (make sure this path is correct)
import { 
  searchUsersRoute,
  recommendedUsersRoute, 
  friendRequestsRoute,
  sendFriendRequestRoute,
  acceptFriendRequestRoute,
  rejectFriendRequestRoute 
} from "../utils/APIRoutes";

export default function FriendsPage() {
  
  const [search, setSearch] = useState("");
  const [recommended, setRecommended] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState({
    page: true,
    search: false,
    sendRequest: false,
    acceptRequest: false
  });
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  // Get user from localStorage
useEffect(() => {
  const user = JSON.parse(
    localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
  );

  if (!user) {
    navigate("/login");
    return;
  }

  fetchData(user);
}, []);

  
  // Create axios instance with auth header
  const api = axios.create({
    baseURL: process.env.REACT_APP_BACKEND_URL,
    headers: {
      Authorization: user?.token // Make sure your token is stored here
    }
  });

  // Add token to requests if not in the instance
  api.interceptors.request.use((config) => {
    const user = JSON.parse(localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY));
    if (user?.token) {
      config.headers.Authorization = user.token;
    }
    return config;
  });

useEffect(() => {
  // Redirect if not logged in
  if (!user) {
    navigate("/login");
    return;
  }
  
  // Create api instance inside useEffect if only used here
  const api = axios.create({
    baseURL: process.env.REACT_APP_BACKEND_URL,
    headers: {
      Authorization: user?.token
    }
  });
  
  // Define fetch functions
  const fetchRecommended = async () => {
    const { data } = await api.get(recommendedUsersRoute);
    setRecommended(data);
  };

  const fetchRequests = async () => {
    const { data } = await api.get(friendRequestsRoute);
    setRequests(data);
  };
  
const fetchData = async (user) => {
  try {
    const { data: recommendedData } = await api.get(recommendedUsersRoute);
    const { data: requestData } = await api.get(friendRequestsRoute);

    setRecommended(recommendedData);
    setRequests(requestData);

  } catch (err) {
    console.error(err);

    if (err.response?.status === 401) {
      localStorage.removeItem(process.env.REACT_APP_LOCALHOST_KEY);
      navigate("/login");
    }
  }
};

  fetchData();
}, [user, navigate]); // Only user and navigate as dependencies

  const fetchRecommended = async () => {
    try {
      const { data } = await api.get(recommendedUsersRoute);
      setRecommended(data);
    } catch (err) {
      console.error("Error fetching recommended:", err);
      throw err; // Re-throw to be caught by Promise.all
    }
  };

  const fetchRequests = async () => {
    try {
      const { data } = await api.get(friendRequestsRoute);
      setRequests(data);
    } catch (err) {
      console.error("Error fetching requests:", err);
      throw err;
    }
  };

  const searchUsers = async (value) => {
    setSearch(value);

    if (value.trim() === "") {
      setSearchResults([]);
      return;
    }

    setLoading(prev => ({ ...prev, search: true }));
    
    try {
      // FIXED: Changed from /api/users/search to /api/friends/search
      const { data } = await api.get(`${searchUsersRoute}?username=${value}`);
      setSearchResults(data);
    } catch (err) {
      console.error("Search error:", err);
      // Show error toast or message
    } finally {
      setLoading(prev => ({ ...prev, search: false }));
    }
  };

  const sendRequest = async (userId) => {
    setLoading(prev => ({ ...prev, sendRequest: true }));
    
    try {
      await api.post(sendFriendRequestRoute, { userId });
      alert("Friend request sent successfully!");
      
      // Refresh recommended list after sending request
      fetchRecommended();
    } catch (err) {
      console.error("Failed to send request:", err);
      
      if (err.response?.status === 409) {
        alert("Friend request already sent or user is already a friend");
      } else if (err.response?.status === 400) {
        alert("Cannot send friend request to yourself");
      } else {
        alert("Failed to send friend request. Please try again.");
      }
    } finally {
      setLoading(prev => ({ ...prev, sendRequest: false }));
    }
  };

  const acceptRequest = async (requestId) => {
    setLoading(prev => ({ ...prev, acceptRequest: true }));
    
    try {
      await api.post(acceptFriendRequestRoute, { requestId });
      
      // Refresh requests list
      await fetchRequests();
      
      // Optionally refresh recommended list
      fetchRecommended();
      
      alert("Friend request accepted!");
    } catch (err) {
      console.error("Failed to accept request:", err);
      alert("Failed to accept request. Please try again.");
    } finally {
      setLoading(prev => ({ ...prev, acceptRequest: false }));
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await api.post(rejectFriendRequestRoute, { requestId });
      
      // Refresh requests list
      fetchRequests();
    } catch (err) {
      console.error("Failed to reject request:", err);
      alert("Failed to reject request. Please try again.");
    }
  };

  // Loading state
  if (loading.page) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading friends data...</p>
        </div>
      </div>
    );
  }

  // Error state
   if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center p-8 bg-red-50 rounded-lg max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      
      {/* Back to Chat Button */}
      <button
        onClick={() => navigate("/")}
        className="mb-4 px-4 py-2 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
      >
        ← Back to Chat
      </button>

      {/* Search Users */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Search Users</h2>

        <input
          type="text"
          placeholder="Search by username..."
          value={search}
          onChange={(e) => searchUsers(e.target.value)}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />

        {loading.search && (
          <div className="mt-4 text-center text-gray-500">Searching...</div>
        )}

        <div className="mt-4 space-y-2">
          {searchResults.length === 0 && search.trim() !== "" && !loading.search && (
            <p className="text-gray-500 text-center py-4">No users found</p>
          )}
          
          {searchResults.map((user) => (
            <div
              key={user._id}
              className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {user.avatarImage && (
                  <img 
                    src={`data:image/svg+xml;base64,${user.avatarImage}`}
                    alt={user.username}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <span className="font-medium">{user.username}</span>
              </div>

              <button
                onClick={() => sendRequest(user._id)}
                disabled={loading.sendRequest}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading.sendRequest ? "Sending..." : "Add Friend"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Friends */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Recommended Friends</h2>

        {recommended.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recommendations available</p>
        ) : (
          <div className="space-y-2">
            {recommended.map((user) => (
              <div
                key={user._id}
                className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {user.avatarImage && (
                    <img 
                      src={`data:image/svg+xml;base64,${user.avatarImage}`}
                      alt={user.username}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <span className="font-medium">{user.username}</span>
                </div>

                <button
                  onClick={() => sendRequest(user._id)}
                  disabled={loading.sendRequest}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading.sendRequest ? "Sending..." : "Add"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Friend Requests */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Friend Requests</h2>

        {requests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No pending friend requests</p>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => (
              <div
                key={req._id}
                className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {req.from?.avatarImage && (
                    <img 
                      src={`data:image/svg+xml;base64,${req.from.avatarImage}`}
                      alt={req.from.username}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <span className="font-medium block">{req.from?.username}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => acceptRequest(req._id)}
                    disabled={loading.acceptRequest}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading.acceptRequest ? "Accepting..." : "Accept"}
                  </button>
                  
                  <button
                    onClick={() => rejectRequest(req._id)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}