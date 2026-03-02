/**
 * Atom: Icon — thin wrapper around Lucide icons for consistent sizing.
 */
export default function Icon({ icon: LucideIcon, size = 20, className = '' }) {
    if (!LucideIcon) return null;
    return <LucideIcon size={size} className={className} />;
}
