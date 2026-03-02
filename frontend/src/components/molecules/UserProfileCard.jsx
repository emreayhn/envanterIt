/**
 * Molecule: UserProfileCard
 */
import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronUp } from 'lucide-react';
import Avatar from '../atoms/Avatar';

export default function UserProfileCard({ name, email, photoUrl, onLogout }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            {open && (
                <div style={{
                    position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 8,
                    background: '#111827', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 14,
                    padding: 6, boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                }}>
                    <button
                        onClick={onLogout}
                        className="btn btn-ghost"
                        style={{ width: '100%', justifyContent: 'flex-start', color: '#f87171', fontSize: 13, padding: '10px 14px' }}
                    >
                        <LogOut style={{ width: 16, height: 16 }} />
                        Çıkış Yap
                    </button>
                </div>
            )}

            <div className="profile-card" onClick={() => setOpen(!open)}>
                <Avatar src={photoUrl} name={name} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="profile-name">{name}</p>
                    <p className="profile-email">{email}</p>
                </div>
                <ChevronUp style={{
                    width: 16, height: 16, color: open ? '#818cf8' : '#475569',
                    transition: 'all 0.3s', transform: open ? 'rotate(180deg)' : 'none',
                }} />
            </div>
        </div>
    );
}
