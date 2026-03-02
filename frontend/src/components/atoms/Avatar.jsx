/**
 * Atom: Avatar
 */
export default function Avatar({ src, name = '', size = 'md' }) {
    const sizeClass = size === 'sm' ? 'avatar-sm' : 'avatar-md';
    const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className={`avatar ${sizeClass}`}>
            {src ? <img src={src} alt={name} /> : initials || '?'}
        </div>
    );
}
