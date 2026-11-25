// dashboard/panels/SurvivorPanel/SurvivorPanel.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SurvivorCard } from '../../../components/SurvivorCard.jsx';

const SORT_OPTIONS = ['Priority', 'Distance', 'Battery'];

function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180, dl = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function SurvivorPanel({ survivors = [], rescuerLat, rescuerLng, onSelect, selectedSurvivor }) {
    const [sortBy, setSortBy] = useState('Priority');
    const navigate = useNavigate();

    const sorted = [...survivors].sort((a, b) => {
        if (sortBy === 'Priority') {
            const pOrder = { CRITICAL: 0, MEDIUM: 1, LOW: 2 };
            return (pOrder[a.priority?.level] ?? 2) - (pOrder[b.priority?.level] ?? 2);
        }
        if (sortBy === 'Battery') return (a.battery_level ?? 100) - (b.battery_level ?? 100);
        if (sortBy === 'Distance' && rescuerLat != null) {
            return (a.distance_m ?? 9999) - (b.distance_m ?? 9999);
        }
        return 0;
    });

    const critical = sorted.filter(s => s.priority?.level === 'CRITICAL');
    const medium = sorted.filter(s => s.priority?.level === 'MEDIUM');
    const low = sorted.filter(s => s.priority?.level === 'LOW');

    const sectionHeader = (label, count, color) => (
        <div className="section-header" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <span className="section-header__title">
                <span style={{ color, marginRight: 6 }}>●</span>
                {label} ({count})
            </span>
        </div>
    );

    const handleNavigate = () => {
        if (!selectedSurvivor) return;
        const zone = survivors.filter(s => {
            if (!s.latitude || !s.longitude) return false;
            return haversine(selectedSurvivor.latitude, selectedSurvivor.longitude, s.latitude, s.longitude) <= 800;
        });
        localStorage.setItem('neurogrid_rescue_zone', JSON.stringify(zone));
        localStorage.setItem('neurogrid_rescue_focus', selectedSurvivor.device_id);
        navigate('/rescue');
    };

    return (
        <>
            <div className="section-header">
                <span className="section-header__title">SURVIVORS · {survivors.length}</span>
                <div className="sort-btns">
                    {SORT_OPTIONS.map(opt => (
                        <button
                            key={opt}
                            className={`sort-btn ${sortBy === opt ? 'active' : ''}`}
                            onClick={() => setSortBy(opt)}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>

            {selectedSurvivor ? (
                <div style={{
                    padding: '6px 12px', background: 'rgba(255,170,0,0.08)',
                    borderBottom: '1px solid rgba(255,170,0,0.2)',
                    fontFamily: 'var(--font-data)', fontSize: '0.68rem',
                    color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <span>📍 FOCUSED</span>
                    <span style={{ opacity: 0.7, flex: 1 }}>{selectedSurvivor.device_id}</span>
                    <button
                        onClick={handleNavigate}
                        style={{
                            background: 'rgba(255,170,0,0.18)',
                            border: '1px solid rgba(255,170,0,0.6)',
                            color: 'var(--accent-amber)',
                            borderRadius: 5, padding: '3px 10px',
                            fontFamily: 'var(--font-data)', fontSize: '0.68rem',
                            fontWeight: 700, cursor: 'pointer',
                            letterSpacing: '0.08em', transition: 'all 0.2s',
                        }}
                    >
                        🧭 Navigate
                    </button>
                    <span style={{ opacity: 0.5 }}>Click card to clear</span>
                </div>
            ) : (
                <div style={{
                    padding: '5px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    fontFamily: 'var(--font-data)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)',
                }}>
                    Click any card to focus · then 🧭 Navigate to dispatch rescue
                </div>
            )}

            <div className="panel-scroll">
                {critical.length > 0 && (
                    <>
                        {sectionHeader('CRITICAL', critical.length, '#C0392B')}
                        {critical.map(s => (
                            <SurvivorCard key={s.device_id} survivor={s} onClick={onSelect} isSelected={selectedSurvivor?.device_id === s.device_id} />
                        ))}
                    </>
                )}
                {medium.length > 0 && (
                    <>
                        {sectionHeader('MEDIUM', medium.length, '#D35400')}
                        {medium.map(s => (
                            <SurvivorCard key={s.device_id} survivor={s} onClick={onSelect} isSelected={selectedSurvivor?.device_id === s.device_id} />
                        ))}
                    </>
                )}
                {low.length > 0 && (
                    <>
                        {sectionHeader('LOW', low.length, '#7D6608')}
                        {low.map(s => (
                            <SurvivorCard key={s.device_id} survivor={s} onClick={onSelect} isSelected={selectedSurvivor?.device_id === s.device_id} />
                        ))}
                    </>
                )}
                {survivors.length === 0 && (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--earth-sand)', fontFamily: 'var(--font-data)', fontSize: '0.8rem' }}>
                        No active survivors.<br />Run Simulation Mode to populate data.
                    </div>
                )}
            </div>
        </>
    );
}
