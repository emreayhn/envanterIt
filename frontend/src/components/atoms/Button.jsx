/**
 * Atom: Button
 */
import { Loader2 } from 'lucide-react';

const variantMap = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
};

const sizeMap = { sm: 'btn-sm', md: '', lg: 'btn-lg' };

export default function Button({
    children, variant = 'primary', size = 'md',
    loading = false, disabled = false, icon: Icon, className = '', ...props
}) {
    return (
        <button
            disabled={disabled || loading}
            className={`btn ${variantMap[variant] || ''} ${sizeMap[size] || ''} ${className}`}
            {...props}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon ? <Icon className="w-4 h-4" /> : null}
            {children}
        </button>
    );
}
