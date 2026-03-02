/**
 * Molecule: FormField — Label + Input + optional error.
 */
import Input from '../atoms/Input';

export default function FormField({
    label,
    error,
    id,
    className = '',
    ...inputProps
}) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label htmlFor={id} className="block text-xs font-medium text-slate-400">
                    {label}
                </label>
            )}
            <Input id={id} error={error} {...inputProps} />
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}
