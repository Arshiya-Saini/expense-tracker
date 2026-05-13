import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="auth-shell">
    <div className="auth-card">
      <h1>Page not found</h1>
      <p className="form-subtitle">The page you're looking for does not exist.</p>
      <Link to="/dashboard" className="secondary-button full-width">
        Back to dashboard
      </Link>
    </div>
  </div>
);

export default NotFound;
