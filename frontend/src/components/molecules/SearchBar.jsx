/**
 * Molecule: SearchBar — Input with a search icon.
 */
import { Search } from 'lucide-react';
import Input from '../atoms/Input';

export default function SearchBar({ value, onChange, placeholder = 'Ara...' }) {
    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="pl-10"
            />
        </div>
    );
}
