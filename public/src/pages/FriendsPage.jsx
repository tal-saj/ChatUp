// FriendsPage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

export default function FriendsPage() {
  const [search, setSearch] = useState("");
  const [recommended, setRecommended] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchRecommended();
    fetchRequests();
  }, []);

  const fetchRecommended = async () => {
    const { data } = await axios.get("/api/friends/recommended");
    setRecommended(data);
  };

  const fetchRequests = async () => {
    const { data } = await axios.get("/api/friends/requests");
    setRequests(data);
  };

  const searchUsers = async (value) => {
    setSearch(value);

    if (value.trim() === "") {
      setSearchResults([]);
      return;
    }

    const { data } = await axios.get(`/api/users/search?username=${value}`);
    setSearchResults(data);
  };

  const sendRequest = async (userId) => {
    await axios.post("/api/friends/send-request", { userId });
    alert("Friend request sent");
  };

  const acceptRequest = async (requestId) => {
    await axios.post("/api/friends/accept", { requestId });
    fetchRequests();
  };

  return (
    <div className="p-6 space-y-8">

      {/* Search Users */}
      <div>
        <h2 className="text-xl font-bold mb-3">Search Users</h2>

        <input
          type="text"
          placeholder="Search by username..."
          value={search}
          onChange={(e) => searchUsers(e.target.value)}
          className="w-full p-3 border rounded-lg"
        />

        <div className="mt-3 space-y-2">
          {searchResults.map((user) => (
            <div
              key={user._id}
              className="flex justify-between items-center p-3 border rounded-lg"
            >
              <span>{user.username}</span>

              <button
                onClick={() => sendRequest(user._id)}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                Add Friend
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Friends */}
      <div>
        <h2 className="text-xl font-bold mb-3">Recommended Friends</h2>

        <div className="space-y-2">
          {recommended.map((user) => (
            <div
              key={user._id}
              className="flex justify-between items-center p-3 border rounded-lg"
            >
              <span>{user.username}</span>

              <button
                onClick={() => sendRequest(user._id)}
                className="px-3 py-1 bg-green-600 text-white rounded"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Friend Requests */}
      <div>
        <h2 className="text-xl font-bold mb-3">Friend Requests</h2>

        <div className="space-y-2">
          {requests.map((req) => (
            <div
              key={req._id}
              className="flex justify-between items-center p-3 border rounded-lg"
            >
              <span>{req.from.username}</span>

              <button
                onClick={() => acceptRequest(req._id)}
                className="px-3 py-1 bg-purple-600 text-white rounded"
              >
                Accept
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}