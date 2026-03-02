/**
 * Atom: Badge — pulsing status indicator.
 */
const config = {
    STOCK: { cls: 'badge-stock', label: 'Stokta' },
    ASSIGNED: { cls: 'badge-assigned', label: 'Zimmetli' },
    REPAIR: { cls: 'badge-repair', label: 'Tamirde' },
    SCRAP: { cls: 'badge-scrap', label: 'Hurda' },
};

export default function Badge({ status }) {
    const c = config[status] || { cls: '', label: status };
    return (
        <span className={`badge ${c.cls}`}>
            <span className="badge-dot" />
            {c.label}
        </span>
    );
}
