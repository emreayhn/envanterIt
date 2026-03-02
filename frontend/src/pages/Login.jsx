/**
 * Page: Login — email/password login screen.
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../components/templates/AuthLayout';
import Button from '../components/atoms/Button';
import Input from '../components/atoms/Input';
import { Server, LogIn, AlertCircle } from 'lucide-react';
import { loginUser } from '../services/api';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await loginUser({ email, password });
            localStorage.setItem('auth_token', data.access_token);
            localStorage.setItem('auth_user', JSON.stringify(data.user));
            navigate('/');
            window.location.reload();
        } catch (err) {
            setError(err.response?.data?.detail || 'Giriş başarısız');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            {/* Logo */}
            <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                    <Server className="w-8 h-8 text-white" />
                </div>
            </div>

            <div>
                <h1 className="text-2xl font-bold gradient-text">IT Envanter</h1>
                <p className="text-sm text-slate-400 mt-1">Takip Sistemi</p>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-4 py-3 rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-3 w-full">
                <Input
                    type="email"
                    placeholder="E-posta"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <Input
                    type="password"
                    placeholder="Şifre"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <Button
                    type="submit"
                    icon={LogIn}
                    size="lg"
                    className="w-full"
                    disabled={loading}
                >
                    {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                </Button>
            </form>

            <p className="text-sm text-slate-500">
                Hesabınız yok mu?{' '}
                <Link to="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                    Kayıt Ol
                </Link>
            </p>
        </AuthLayout>
    );
}
