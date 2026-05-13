import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const SignupPage = () => {
  const { register, authenticated, authError, setAuthError } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
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

    if (!name.trim() || !email.trim() || !password) {
      setError("Name, email, and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      await register({ name: name.trim(), email: email.trim(), password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Signup failed.";
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
          <p className="brand-copy">Create a fast account and start tracking your spending today.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h1>Create account</h1>
          <p className="form-subtitle">Signup takes just a minute and keeps your data private.</p>

          {(error || authError) && (
            <div className="alert alert--error">{error || authError}</div>
          )}

          <label className="form-label">
            Full name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your full name"
              autoComplete="name"
            />
          </label>
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
              placeholder="Choose a password"
              autoComplete="new-password"
            />
          </label>

          <button type="submit" className="primary-button full-width" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="form-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
