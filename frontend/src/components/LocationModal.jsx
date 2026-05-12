/**
 * LocationModal
 * -------------
 * Google Maps-style location picker modal for the buyer delivery address.
 *
 * Features:
 *  - Real-time autocomplete suggestions as you type (debounced 300ms, 2+ chars)
 *  - Keyboard navigation: ↑ ↓ Enter Escape
 *  - GPS "Use my location" with animated pulse ring
 *  - Reverse geocoding on map click and GPS
 *  - Animated dropdown with highlighted matched text and type icons
 *  - Map view auto-pans on selection
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MapPin, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon paths so markers show up under Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER      = [20.5937, 78.9629]; // India center
const PHOTON_SEARCH    = 'https://photon.komoot.io/api';
const PHOTON_REVERSE   = 'https://photon.komoot.io/reverse';

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounced(value, delay = 300) {
    const [dv, setDv] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDv(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return dv;
}

// ── Map sub-components ────────────────────────────────────────────────────────
const ClickMarker = ({ position, setPosition }) => {
    useMapEvents({
        click(e) { setPosition([e.latlng.lat, e.latlng.lng]); }
    });
    return position ? <Marker position={position} /> : null;
};

const MapPanner = ({ position }) => {
    const map = useMap();
    useEffect(() => {
        if (position) map.setView(position, Math.max(map.getZoom(), 16), { animate: true });
    }, [position, map]);
    return null;
};

// ── Highlighted text helper ───────────────────────────────────────────────────
function HighlightedText({ text, query }) {
    if (!query || !text) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
        <span>
            {text.slice(0, idx)}
            <strong style={{ color: '#4f46e5' }}>{text.slice(idx, idx + query.length)}</strong>
            {text.slice(idx + query.length)}
        </span>
    );
}

// Type icon helper
function typeIcon(type = '') {
    const t = type.toLowerCase();
    if (['restaurant', 'cafe', 'food'].some(k => t.includes(k))) return '🍽️';
    if (['shop', 'mall', 'retail'].some(k => t.includes(k))) return '🏪';
    if (['hospital', 'clinic', 'pharmacy'].some(k => t.includes(k))) return '🏥';
    if (['school', 'college', 'university'].some(k => t.includes(k))) return '🏫';
    if (['park', 'garden'].some(k => t.includes(k))) return '🌳';
    if (['hotel', 'hostel'].some(k => t.includes(k))) return '🏨';
    if (['road', 'street', 'highway'].some(k => t.includes(k))) return '🛣️';
    if (['city', 'town', 'village', 'suburb'].some(k => t.includes(k))) return '🏙️';
    return '📍';
}

const CSS = `
@keyframes lm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes lm-pulse { 0%{transform:scale(1);opacity:1;} 100%{transform:scale(2.2);opacity:0;} }
@keyframes lm-dropdown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
@keyframes lm-modal-in { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
.lm-sug:hover { background: #f5f3ff !important; }
.lm-sug:focus { outline: 2px solid #6366f1; background: #ede9fe !important; }
`;

// ── Main Modal ────────────────────────────────────────────────────────────────
const LocationModal = ({ isOpen, onClose, onSelect }) => {
    const [query, setQuery]           = useState('');
    const [results, setResults]       = useState([]);
    const [status, setStatus]         = useState('idle'); // idle | loading | gps
    const [activeIdx, setActiveIdx]   = useState(-1);
    const [open, setOpen]             = useState(false);
    const [position, setPosition]     = useState(null);  // [lat, lon]
    const [address, setAddress]       = useState('');
    const [mapReady, setMapReady]     = useState(false);
    const [mapKey, setMapKey]         = useState(0);

    const debouncedQuery  = useDebounced(query, 300);
    const inputRef        = useRef(null);
    const wrapperRef      = useRef(null);
    const listRef         = useRef(null);
    const abortRef        = useRef(null);

    // Reset on open
    useEffect(() => {
        if (!isOpen) { setMapReady(false); return; }
        setQuery(''); setResults([]); setOpen(false); setActiveIdx(-1); setStatus('idle');
        const stored = localStorage.getItem('selectedLocation');
        if (stored) {
            try {
                const s = JSON.parse(stored);
                if (s?.lat && s?.lon) { setPosition([s.lat, s.lon]); setAddress(s.displayName || ''); }
            } catch {}
        }
        const id = setTimeout(() => { setMapKey(k => k + 1); setMapReady(true); inputRef.current?.focus(); }, 50);
        return () => clearTimeout(id);
    }, [isOpen]);

    // Reverse geocode on pin change
    useEffect(() => {
        if (!position) return;
        fetch(`${PHOTON_REVERSE}?lat=${position[0]}&lon=${position[1]}`, { headers: { 'Accept-Language': 'en' } })
            .then(r => r.json())
            .then(j => {
                if (j.features && j.features.length > 0) {
                    const p = j.features[0].properties;
                    const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean);
                    setAddress([...new Set(parts)].join(', '));
                } else {
                    setAddress(`${position[0].toFixed(5)}, ${position[1].toFixed(5)}`);
                }
            })
            .catch(() => setAddress(`${position[0].toFixed(5)}, ${position[1].toFixed(5)}`));
    }, [position]);

    // Real-time search
    useEffect(() => {
        const q = debouncedQuery.trim();
        if (q.length < 2) { setResults([]); setOpen(false); setStatus('idle'); return; }
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        setStatus('loading'); setActiveIdx(-1);
        fetch(`${PHOTON_SEARCH}?q=${encodeURIComponent(q)}&limit=10`,
            { signal: abortRef.current.signal, headers: { 'Accept-Language': 'en' } })
            .then(r => r.json())
            .then(data => {
                const mapped = (data.features || []).map(f => {
                    const p = f.properties;
                    const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean);
                    return {
                        lat: parseFloat(f.geometry.coordinates[1]),
                        lon: parseFloat(f.geometry.coordinates[0]),
                        display_name: [...new Set(parts)].join(', '),
                        type: p.osm_value
                    };
                });
                setResults(mapped || []); setOpen(true); setStatus('idle'); 
            })
            .catch(e => { if (e.name !== 'AbortError') { setResults([]); setStatus('idle'); } });
    }, [debouncedQuery]);

    // Close dropdown on outside click
    useEffect(() => {
        const h = e => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    if (!isOpen) return null;

    const handleSelect = (r) => {
        const pos = [parseFloat(r.lat), parseFloat(r.lon)];
        setPosition(pos);
        setQuery(r.display_name.split(',').slice(0, 3).join(', '));
        setAddress(r.display_name);
        setOpen(false); setResults([]); setActiveIdx(-1);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') { setOpen(false); return; }
        if (!open || results.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); const n = Math.min(activeIdx + 1, results.length - 1); setActiveIdx(n); listRef.current?.children[n]?.scrollIntoView({ block: 'nearest' }); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); const n = Math.max(activeIdx - 1, 0); setActiveIdx(n); listRef.current?.children[n]?.scrollIntoView({ block: 'nearest' }); }
        else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); handleSelect(results[activeIdx]); }
    };

    const handleGPS = () => {
        if (!navigator.geolocation) { alert('Geolocation not supported.'); return; }
        setStatus('gps');
        navigator.geolocation.getCurrentPosition(
            pos => { setPosition([pos.coords.latitude, pos.coords.longitude]); setStatus('idle'); },
            err => { setStatus('idle'); alert('Could not get location: ' + (err.message || 'denied')); },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleConfirm = () => {
        if (!position) { alert('Please pick a location.'); return; }
        const payload = { displayName: address || `${position[0].toFixed(5)}, ${position[1].toFixed(5)}`, lat: position[0], lon: position[1] };
        try { localStorage.setItem('selectedLocation', JSON.stringify(payload)); } catch {}
        onSelect?.(payload);
        onClose();
    };

    const isLoading = status === 'loading';
    const isGPS     = status === 'gps';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
        }}>
            <style>{CSS}</style>
            <div style={{
                background: '#fff', borderRadius: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
                width: '100%', maxWidth: 760, overflow: 'hidden', position: 'relative',
                animation: 'lm-modal-in 0.2s ease-out',
            }}>
                {/* Header */}
                <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Select Delivery Location</h2>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Search or pin your exact delivery address on the map.</p>
                    </div>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 50, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 }}>
                        <X size={17} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '16px 24px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                    {/* Left: search + results */}
                    <div ref={wrapperRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Search input */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            border: open ? '2px solid #6366f1' : '2px solid #e2e8f0',
                            borderRadius: 14, padding: '0 12px', background: '#fff',
                            boxShadow: open ? '0 0 0 4px rgba(99,102,241,0.1)' : '0 1px 4px rgba(0,0,0,0.07)',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}>
                            <svg width="15" height="15" fill="none" stroke={open ? '#6366f1' : '#94a3b8'} strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, transition: 'stroke 0.2s' }}>
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search address, area or pincode…"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onFocus={() => results.length > 0 && setOpen(true)}
                                onKeyDown={handleKeyDown}
                                autoComplete="off"
                                style={{
                                    border: 'none', outline: 'none', background: 'transparent',
                                    fontSize: 13, padding: '11px 0', flex: 1, color: '#1e293b', minWidth: 0,
                                }}
                            />
                            {isLoading && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"
                                    style={{ animation: 'lm-spin 0.8s linear infinite', flexShrink: 0 }}>
                                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                </svg>
                            )}
                            {!isLoading && query && (
                                <button type="button" onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus(); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#94a3b8', lineHeight: 0 }}>
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Dropdown */}
                        {open && results.length > 0 && (
                            <div ref={listRef} style={{
                                position: 'absolute', top: 48, left: 0, right: 0, zIndex: 50,
                                background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14,
                                boxShadow: '0 12px 32px rgba(0,0,0,0.13)', maxHeight: 260, overflowY: 'auto',
                                animation: 'lm-dropdown 0.15s ease-out',
                            }}>
                                {results.map((r, i) => {
                                    const parts = r.display_name.split(', ');
                                    const main  = parts.slice(0, 2).join(', ');
                                    const sub   = parts.slice(2, 5).join(', ');
                                    const isAct = i === activeIdx;
                                    return (
                                        <button key={r.place_id || i} type="button" className="lm-sug"
                                            onClick={() => handleSelect(r)}
                                            onMouseEnter={() => setActiveIdx(i)}
                                            style={{
                                                width: '100%', textAlign: 'left', padding: '9px 12px',
                                                border: 'none', borderBottom: i < results.length - 1 ? '1px solid #f1f5f9' : 'none',
                                                background: isAct ? '#f5f3ff' : 'none', cursor: 'pointer',
                                                display: 'flex', alignItems: 'flex-start', gap: 9,
                                            }}>
                                            <div style={{
                                                width: 26, height: 26, borderRadius: 7, flexShrink: 0, marginTop: 1,
                                                background: isAct ? '#ede9fe' : '#f8fafc',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                                            }}>
                                                {typeIcon(r.type || r.class)}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <HighlightedText text={main} query={query.split(',')[0]} />
                                                </p>
                                                {sub && <p style={{ margin: '1px 0 0', fontSize: 11, color: '#64748b' }}>{sub}</p>}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* GPS button */}
                        <button type="button" onClick={handleGPS}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
                                borderRadius: 12, border: '1.5px solid #e2e8f0',
                                background: isGPS ? '#ede9fe' : '#f8fafc', cursor: 'pointer',
                                color: isGPS ? '#6366f1' : '#475569', fontSize: 13, fontWeight: 600,
                                transition: 'all 0.2s', position: 'relative', overflow: 'visible',
                            }}>
                            {isGPS && <span style={{ position: 'absolute', inset: -4, borderRadius: 14, border: '2px solid #6366f1', animation: 'lm-pulse 1.2s ease-out infinite', pointerEvents: 'none' }} />}
                            <Navigation size={14} style={{ color: isGPS ? '#6366f1' : '#64748b' }} />
                            {isGPS ? 'Detecting location…' : 'Use my current location'}
                        </button>

                        {/* Selected address preview */}
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Selected Address</p>
                            <div style={{
                                padding: '10px 14px', borderRadius: 12, background: '#f8fafc',
                                border: '1.5px solid ' + (address ? '#bbf7d0' : '#e2e8f0'),
                                minHeight: 54, display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                {address ? (
                                    <>
                                        <MapPin size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                                        <p style={{ margin: 0, fontSize: 12, color: '#166534', fontWeight: 500, lineHeight: 1.5 }}>{address}</p>
                                    </>
                                ) : (
                                    <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>No location selected yet.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Map */}
                    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1.5px solid #e2e8f0', height: 340, minHeight: 280 }}>
                        {mapReady && (
                            <MapContainer
                                key={mapKey}
                                center={position || DEFAULT_CENTER}
                                zoom={position ? 16 : 5}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <ClickMarker position={position} setPosition={setPosition} />
                                <MapPanner position={position} />
                            </MapContainer>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fafafa' }}>
                    <button onClick={onClose}
                        style={{ padding: '9px 18px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button onClick={handleConfirm}
                        style={{
                            padding: '9px 22px', borderRadius: 12, border: 'none',
                            background: position ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#e2e8f0',
                            fontSize: 13, fontWeight: 700, color: position ? '#fff' : '#94a3b8',
                            cursor: position ? 'pointer' : 'not-allowed',
                            boxShadow: position ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
                            transition: 'all 0.2s',
                        }}>
                        Confirm Location
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LocationModal;
