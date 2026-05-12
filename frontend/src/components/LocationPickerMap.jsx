/**
 * LocationPickerMap
 * -----------------
 * Interactive Leaflet map with Google Maps-style real-time geocoding search.
 *
 * Features:
 *  - Real-time autocomplete suggestions as you type (300 ms debounce, 2+ chars)
 *  - Keyboard navigation: ↑ ↓ Enter Escape through suggestions
 *  - "Use my location" GPS button with animated pulse while fetching
 *  - Reverse geocoding on every pin placement / drag
 *  - Highlighted matching text in suggestions (like Google Places)
 *  - Animated dropdown entrance
 *  - Draggable marker with auto-reverse geocode on dragend
 *
 * Props:
 *   lat       {number|null}  current latitude
 *   lng       {number|null}  current longitude
 *   onChange  {(lat, lng) => void}  called whenever the pin moves
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Fix Leaflet default icon paths inside Vite bundler ───────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom indigo pin for the selected shop location
const shopIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const DEFAULT_CENTER = [22.7196, 75.8577]; // Indore fallback
const DEFAULT_ZOOM   = 13;
const PHOTON_SEARCH  = 'https://photon.komoot.io/api';
const PHOTON_REVERSE = 'https://photon.komoot.io/reverse';

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
const ClickHandler = ({ onMapClick }) => {
    useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng); } });
    return null;
};

const MapPanner = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        if (lat != null && lng != null) {
            map.setView([lat, lng], Math.max(map.getZoom(), 16), { animate: true });
        }
    }, [lat, lng, map]);
    return null;
};

// ── Highlight helper: bolds query matches inside display text ─────────────────
function HighlightedText({ text, query }) {
    if (!query || !text) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
        <span>
            {text.slice(0, idx)}
            <strong style={{ color: '#4f46e5', fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</strong>
            {text.slice(idx + query.length)}
        </span>
    );
}

// ── CSS injected once ─────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@keyframes lpm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes lpm-pulse-ring { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.4); opacity: 0; } }
@keyframes lpm-dropdown-in { from { opacity: 0; transform: translateY(-6px) scaleY(0.96); } to { opacity: 1; transform: translateY(0) scaleY(1); } }
.lpm-suggestion-btn:hover { background: #f5f3ff !important; }
.lpm-suggestion-btn:focus { outline: 2px solid #6366f1; outline-offset: -2px; background: #ede9fe !important; }
`;

// ── Real-time geocoding search bar ────────────────────────────────────────────
const GeoSearchBar = ({ onSelect }) => {
    const [query, setQuery]           = useState('');
    const [results, setResults]       = useState([]);
    const [status, setStatus]         = useState('idle'); // idle | loading | done | gps
    const [open, setOpen]             = useState(false);
    const [activeIdx, setActiveIdx]   = useState(-1);
    const [address, setAddress]       = useState('');     // resolved address after selection
    const debouncedQuery              = useDebounced(query, 300);
    const wrapperRef                  = useRef(null);
    const inputRef                    = useRef(null);
    const abortRef                    = useRef(null);
    const listRef                     = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const h = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    // Real-time search
    useEffect(() => {
        const q = debouncedQuery.trim();
        if (q.length < 2) {
            setResults([]);
            setOpen(false);
            setStatus('idle');
            return;
        }
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        setStatus('loading');
        setActiveIdx(-1);

        fetch(
            `${PHOTON_SEARCH}?q=${encodeURIComponent(q)}&limit=10`,
            { signal: abortRef.current.signal, headers: { 'Accept-Language': 'en' } }
        )
            .then(r => r.json())
            .then(data => {
                const mapped = (data.features || []).map(f => {
                    const p = f.properties;
                    const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean);
                    const uniqueParts = [...new Set(parts)];
                    return {
                        lat: parseFloat(f.geometry.coordinates[1]),
                        lon: parseFloat(f.geometry.coordinates[0]),
                        display_name: uniqueParts.join(', '),
                        type: p.osm_value
                    };
                });
                setResults(mapped || []);
                setOpen(true);
                setStatus('done');
            })
            .catch(e => { if (e.name !== 'AbortError') { setResults([]); setStatus('done'); } });
    }, [debouncedQuery]);

    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (!open || results.length === 0) {
            if (e.key === 'Escape') { setOpen(false); setQuery(''); }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = Math.min(activeIdx + 1, results.length - 1);
            setActiveIdx(next);
            scrollIntoView(next);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = Math.max(activeIdx - 1, 0);
            setActiveIdx(prev);
            scrollIntoView(prev);
        } else if (e.key === 'Enter' && activeIdx >= 0) {
            e.preventDefault();
            handleSelect(results[activeIdx]);
        } else if (e.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
        }
    };

    const scrollIntoView = (idx) => {
        if (!listRef.current) return;
        const el = listRef.current.children[idx];
        if (el) el.scrollIntoView({ block: 'nearest' });
    };

    const handleSelect = (result) => {
        const name = result.display_name.split(',').slice(0, 3).join(', ');
        setQuery(name);
        setAddress(result.display_name);
        setOpen(false);
        setResults([]);
        setActiveIdx(-1);
        onSelect({ lat: parseFloat(result.lat), lng: parseFloat(result.lon), displayName: result.display_name });
    };

    // GPS – detect user location
    const handleGPS = () => {
        if (!navigator.geolocation) { alert('Geolocation not supported in this browser.'); return; }
        setStatus('gps');
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude: lat, longitude: lon } = pos.coords;
                try {
                    const res = await fetch(`${PHOTON_REVERSE}?lat=${lat}&lon=${lon}`, { headers: { 'Accept-Language': 'en' } });
                    const json = await res.json();
                    let name = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
                    if (json.features && json.features.length > 0) {
                        const p = json.features[0].properties;
                        const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean);
                        name = [...new Set(parts)].join(', ');
                    }
                    setQuery(name.split(',').slice(0, 3).join(', '));
                    setAddress(name);
                    onSelect({ lat, lng: lon, displayName: name });
                } catch {
                    onSelect({ lat, lng: lon, displayName: `${lat.toFixed(5)}, ${lon.toFixed(5)}` });
                }
                setStatus('idle');
            },
            (err) => {
                setStatus('idle');
                alert('Could not get location: ' + (err.message || 'Permission denied'));
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const isLoading = status === 'loading';
    const isGPS     = status === 'gps';

    return (
        <div ref={wrapperRef} style={{ position: 'relative', zIndex: 1000 }}>
            <style>{GLOBAL_CSS}</style>

            {/* Input row */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#fff', borderRadius: 14,
                border: open ? '2px solid #6366f1' : '2px solid #e2e8f0',
                boxShadow: open ? '0 0 0 4px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.07)',
                padding: '0 12px', transition: 'border-color 0.2s, box-shadow 0.2s',
            }}>
                {/* Search icon */}
                <svg width="16" height="16" fill="none" stroke={open ? '#6366f1' : '#94a3b8'} strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, transition: 'stroke 0.2s' }}>
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>

                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search area, street or landmark…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    style={{
                        border: 'none', outline: 'none', background: 'transparent',
                        fontSize: 13, fontFamily: 'inherit', padding: '11px 0',
                        flex: 1, color: '#1e293b', minWidth: 0,
                    }}
                />

                {/* Spinner or clear */}
                {isLoading && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"
                        style={{ animation: 'lpm-spin 0.8s linear infinite', flexShrink: 0 }}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                )}
                {!isLoading && query && (
                    <button type="button"
                        onClick={() => { setQuery(''); setResults([]); setOpen(false); setAddress(''); inputRef.current?.focus(); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#94a3b8', flexShrink: 0, lineHeight: 0 }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                )}

                {/* GPS button */}
                <button type="button" onClick={handleGPS}
                    title="Use my current location"
                    style={{
                        background: isGPS ? '#ede9fe' : '#f8fafc',
                        border: '1px solid #e2e8f0', borderRadius: 8,
                        padding: '5px 8px', cursor: 'pointer', flexShrink: 0,
                        display: 'flex', alignItems: 'center', gap: 4, lineHeight: 0,
                        color: isGPS ? '#6366f1' : '#64748b',
                        transition: 'all 0.2s',
                        position: 'relative', overflow: 'visible',
                    }}>
                    {isGPS && (
                        <span style={{
                            position: 'absolute', inset: -3, borderRadius: 10,
                            border: '2px solid #6366f1',
                            animation: 'lpm-pulse-ring 1.2s ease-out infinite',
                            pointerEvents: 'none',
                        }} />
                    )}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                    </svg>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.2 }}>GPS</span>
                </button>
            </div>

            {/* Dropdown */}
            {open && results.length > 0 && (
                <div
                    ref={listRef}
                    style={{
                        position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                        background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14,
                        boxShadow: '0 12px 32px rgba(0,0,0,0.13)', maxHeight: 280,
                        overflowY: 'auto', zIndex: 2000,
                        animation: 'lpm-dropdown-in 0.15s ease-out',
                        transformOrigin: 'top center',
                    }}>
                    {results.map((r, i) => {
                        const parts    = r.display_name.split(', ');
                        const main     = parts.slice(0, 2).join(', ');
                        const sub      = parts.slice(2, 5).join(', ');
                        const typeIcon = getTypeIcon(r.type || r.class);
                        const isActive = i === activeIdx;
                        return (
                            <button
                                key={r.place_id || i}
                                type="button"
                                className="lpm-suggestion-btn"
                                onClick={() => handleSelect(r)}
                                onMouseEnter={() => setActiveIdx(i)}
                                style={{
                                    width: '100%', textAlign: 'left', padding: '10px 14px',
                                    border: 'none',
                                    borderBottom: i < results.length - 1 ? '1px solid #f1f5f9' : 'none',
                                    background: isActive ? '#f5f3ff' : 'none',
                                    cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
                                    transition: 'background 0.1s',
                                }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 1,
                                    background: isActive ? '#ede9fe' : '#f8fafc',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#6366f1', fontSize: 14, transition: 'background 0.15s',
                                }}>
                                    {typeIcon}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        <HighlightedText text={main} query={query.split(',')[0]} />
                                    </p>
                                    {sub && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>{sub}</p>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* No results notice */}
            {open && results.length === 0 && status === 'done' && query.trim().length >= 2 && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                    background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14,
                    padding: '14px 16px', fontSize: 13, color: '#64748b',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.09)', zIndex: 2000,
                    animation: 'lpm-dropdown-in 0.15s ease-out',
                }}>
                    <span style={{ marginRight: 6 }}>🔍</span>
                    No results for <strong>"{query}"</strong>. Try a different search.
                </div>
            )}
        </div>
    );
};

// Icon per OSM feature type
function getTypeIcon(type = '') {
    const t = (type || '').toLowerCase();
    if (['restaurant', 'cafe', 'fast_food', 'bar', 'pub'].some(k => t.includes(k))) return '🍽️';
    if (['shop', 'mall', 'supermarket', 'retail'].some(k => t.includes(k))) return '🏪';
    if (['hospital', 'clinic', 'pharmacy'].some(k => t.includes(k))) return '🏥';
    if (['school', 'college', 'university'].some(k => t.includes(k))) return '🏫';
    if (['park', 'garden', 'recreation'].some(k => t.includes(k))) return '🌳';
    if (['hotel', 'hostel', 'guest'].some(k => t.includes(k))) return '🏨';
    if (['bank', 'atm'].some(k => t.includes(k))) return '🏦';
    if (['fuel', 'petrol', 'gas'].some(k => t.includes(k))) return '⛽';
    if (['road', 'street', 'highway'].some(k => t.includes(k))) return '🛣️';
    if (['city', 'town', 'village', 'suburb'].some(k => t.includes(k))) return '🏙️';
    return '📍';
}

// ── Main component ─────────────────────────────────────────────────────────────
const LocationPickerMap = ({ lat, lng, onChange }) => {
    const hasPin = lat != null && lng != null;
    const center = hasPin ? [lat, lng] : DEFAULT_CENTER;

    // Reverse geocode state shown in status bar
    const [resolvedAddress, setResolvedAddress] = useState('');
    const [reverseLoading, setReverseLoading]   = useState(false);

    // Reverse geocode whenever pin coordinates change
    useEffect(() => {
        if (!hasPin) { setResolvedAddress(''); return; }
        let cancelled = false;
        setReverseLoading(true);
        fetch(`${PHOTON_REVERSE}?lat=${lat}&lon=${lng}`, { headers: { 'Accept-Language': 'en' } })
            .then(r => r.json())
            .then(data => { 
                if (!cancelled) {
                    if (data.features && data.features.length > 0) {
                        const p = data.features[0].properties;
                        const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean);
                        setResolvedAddress([...new Set(parts)].join(', '));
                    } else {
                        setResolvedAddress('');
                    }
                } 
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setReverseLoading(false); });
        return () => { cancelled = true; };
    }, [lat, lng, hasPin]);

    const handleMapClick = (cLat, cLng) =>
        onChange(parseFloat(cLat.toFixed(6)), parseFloat(cLng.toFixed(6)));

    const handleMarkerDrag = (e) => {
        const { lat: dLat, lng: dLng } = e.target.getLatLng();
        onChange(parseFloat(dLat.toFixed(6)), parseFloat(dLng.toFixed(6)));
    };

    const handleSearchSelect = useCallback(({ lat: sLat, lng: sLng, displayName }) => {
        setResolvedAddress(displayName || '');
        onChange(parseFloat(sLat.toFixed(6)), parseFloat(sLng.toFixed(6)));
    }, [onChange]);

    return (
        <div style={{ borderRadius: 18, overflow: 'hidden', border: '2px solid rgba(99,102,241,0.25)', boxShadow: '0 4px 24px rgba(99,102,241,0.08)', background: '#fff' }}>

            {/* Search bar row */}
            <div style={{ padding: '10px 12px 8px', background: 'linear-gradient(135deg,#faf5ff 0%,#f5f3ff 100%)', borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
                <GeoSearchBar onSelect={handleSearchSelect} />
            </div>

            {/* Map */}
            <div style={{ position: 'relative' }}>
                {/* Overlay hint when no pin */}
                {!hasPin && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        pointerEvents: 'none',
                    }}>
                        <div style={{
                            background: 'rgba(255,255,255,0.93)',
                            borderRadius: 14, padding: '9px 18px',
                            fontSize: 13, fontWeight: 600, color: '#4f46e5',
                            boxShadow: '0 4px 20px rgba(99,102,241,0.18)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(99,102,241,0.18)',
                            display: 'flex', alignItems: 'center', gap: 7,
                        }}>
                            <span style={{ fontSize: 16 }}>📍</span>
                            Search above or tap the map to drop your pin
                        </div>
                    </div>
                )}

                <MapContainer
                    center={center}
                    zoom={DEFAULT_ZOOM}
                    style={{ height: '320px', width: '100%' }}
                    scrollWheelZoom
                    zoomControl={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ClickHandler onMapClick={handleMapClick} />
                    <MapPanner lat={lat} lng={lng} />
                    {hasPin && (
                        <Marker
                            position={[lat, lng]}
                            icon={shopIcon}
                            draggable
                            eventHandlers={{ dragend: handleMarkerDrag }}
                        />
                    )}
                </MapContainer>
            </div>

            {/* Status bar */}
            {hasPin ? (
                <div style={{
                    background: 'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)',
                    borderTop: '1px solid #bbf7d0', padding: '8px 14px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                            {reverseLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#166534' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"
                                        style={{ animation: 'lpm-spin 0.8s linear infinite', flexShrink: 0 }}>
                                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                    </svg>
                                    Resolving address…
                                </div>
                            ) : (
                                <>
                                    {resolvedAddress && (
                                        <p style={{ margin: 0, fontSize: 12, color: '#166534', fontWeight: 600, lineHeight: 1.4 }}>
                                            📍 {resolvedAddress.split(',').slice(0, 4).join(', ')}
                                        </p>
                                    )}
                                    <p style={{ margin: resolvedAddress ? '2px 0 0' : 0, fontSize: 11, color: '#15803d', fontFamily: 'monospace' }}>
                                        {lat.toFixed(6)}, {lng.toFixed(6)}
                                    </p>
                                </>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => { onChange(null, null); setResolvedAddress(''); }}
                            style={{
                                background: '#fee2e2', border: 'none', borderRadius: 20,
                                padding: '3px 12px', fontSize: 11, fontWeight: 700,
                                color: '#dc2626', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                            }}>
                            Clear pin
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ background: '#fffbeb', padding: '8px 14px', borderTop: '1px solid #fde68a', fontSize: 12, color: '#92400e' }}>
                    💡 Search for your area, then fine-tune by clicking or dragging the pin.
                </div>
            )}
        </div>
    );
};

export default LocationPickerMap;
