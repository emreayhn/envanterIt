/**
 * Page: Register — new user registration screen.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/templates/AuthLayout';
import Button from '../components/atoms/Button';
import Input from '../components/atoms/Input';
import { Server, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { registerUser } from '../services/api';

export default function Register() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await registerUser({ full_name: fullName, email, password });
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.detail || 'Kayıt başarısız');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <AuthLayout>
                <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-emerald-500/30">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                    </div>
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-emerald-400">Kayıt Başarılı!</h1>
                    <p className="text-sm text-slate-400 mt-2">
                        Hesabınız oluşturuldu. Admin onayını bekleyin.
                        <br />
                        Onaylandıktan sonra giriş yapabilirsiniz.
                    </p>
                </div>

                <Link to="/login">
                    <Button size="lg" className="w-full">
                        Giriş Sayfasına Dön
                    </Button>
                </Link>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            {/* Logo */}
            <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                    <Server className="w-8 h-8 text-white" />
                </div>
            </div>

            <div>
                <h1 className="text-2xl font-bold gradient-text">Kayıt Ol</h1>
                <p className="text-sm text-slate-400 mt-1">IT Envanter Takip Sistemi</p>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-4 py-3 rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleRegister} className="flex flex-col gap-3 w-full">
                <Input
                    type="text"
                    placeholder="Ad Soyad"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                />
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
                    minLength={6}
                />
                <Button
                    type="submit"
                    icon={UserPlus}
                    size="lg"
                    className="w-full"
                    disabled={loading}
                >
                    {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
                </Button>
            </form>

            <p className="text-sm text-slate-500">
                Zaten hesabınız var mı?{' '}
                <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                    Giriş Yap
                </Link>
            </p>
        </AuthLayout>
    );
}
