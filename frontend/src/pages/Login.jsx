/**
 * Page: Login — "Microsoft ile Giriş Yap" centred screen.
 */
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../config/authConfig';
import AuthLayout from '../components/templates/AuthLayout';
import Button from '../components/atoms/Button';
import { Server, LogIn } from 'lucide-react';

export default function Login() {
    const { instance } = useMsal();

    const handleLogin = () => {
        instance.loginRedirect(loginRequest).catch(console.error);
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

            <Button
                onClick={handleLogin}
                icon={LogIn}
                size="lg"
                className="w-full"
            >
                Microsoft ile Giriş Yap
            </Button>

            <p className="text-xs text-slate-600">
                Yalnızca yetkili IT personeli erişebilir.
            </p>
        </AuthLayout>
    );
}
