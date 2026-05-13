import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const LoginPage = () => {
  const { login, authenticated, authError, setAuthError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (authenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setAuthError(null);

    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);
      await login({ email: email.trim(), password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Login failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">ExpensePro</span>
          <p className="brand-copy">Secure sign in to review your budget and manage your transactions.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h1>Welcome back</h1>
          <p className="form-subtitle">Sign in to continue to your expense dashboard.</p>

          {(error || authError) && (
            <div className="alert alert--error">{error || authError}</div>
          )}

          <label className="form-label">
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <label className="form-label">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </label>

          <button type="submit" className="primary-button full-width" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="form-footer">
            Don’t have an account? <Link to="/signup">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
