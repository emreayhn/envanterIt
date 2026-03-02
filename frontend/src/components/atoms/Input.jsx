/**
 * Atom: Input
 */
import { forwardRef } from 'react';

const Input = forwardRef(function Input({ className = '', ...props }, ref) {
    return <input ref={ref} className={`input ${className}`} {...props} />;
});

export default Input;
