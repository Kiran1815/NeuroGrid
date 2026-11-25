// client/src/pages/Login/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../core/auth/authService';
import './Login.css';

export const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await authService.login(username, password);

        if (result.success) {
            // Redirect to NDMA Master Command on success
            navigate('/ndma');
        } else {
            setError(result.message || 'Invalid credentials');
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h1 className="login-title">Rescue HQ</h1>
                <p className="login-subtitle">NeuroGrid Secure Access</p>

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleLogin} className="login-form">
                    <div className="input-group">
                        <label htmlFor="username">Operator ID</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter ID"
                            disabled={loading}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Access Key</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter Key"
                            disabled={loading}
                            required
                        />
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Authenticating...' : 'Access Dashboard'}
                    </button>
                </form>

                <button className="back-button" onClick={() => navigate('/')}>
                    Return to Public Network
                </button>
            </div>
        </div>
    );
};
