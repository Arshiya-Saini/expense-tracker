import { useAuth } from "../context/AuthContext.jsx";
import { Link } from "react-router-dom";

const UserProfile = () => {
  const { user, logout } = useAuth();

  return (
    <div className="auth-shell auth-shell--profile">
      <div className="profile-card">
        <div className="profile-header">
          <div>
            <p className="app-label">Profile</p>
            <h1>{user?.name || "Guest"}</h1>
            <p className="profile-subtitle">Manage your account and secure your data.</p>
          </div>
          <Link to="/dashboard" className="secondary-button">Back to dashboard</Link>
        </div>

        <div className="profile-details">
          <div className="profile-row">
            <span>Email</span>
            <strong>{user?.email || "Not provided"}</strong>
          </div>
          <div className="profile-row">
            <span>Joined</span>
            <strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}</strong>
          </div>
        </div>

        <button type="button" className="primary-button full-width" onClick={logout}>
          Sign out
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
