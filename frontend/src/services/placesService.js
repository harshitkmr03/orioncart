/**
 * placesService.js
 * -----------------
 * Hybrid Places Search & Geocoding Service.
 * - Primary: Google Maps Places API (Autocomplete & Geocoder) for finding buildings, colleges, societies in India.
 * - Fallback: Photon / OpenStreetMap for zero-failure resilience when API key or quota is unavailable.
 */

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const PHOTON_SEARCH  = 'https://photon.komoot.io/api';
const PHOTON_REVERSE = 'https://photon.komoot.io/reverse';

let googleMapsPromise = null;

/**
 * Dynamically loads Google Maps JavaScript SDK with the `places` library.
 */
export function loadGoogleMaps() {
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
        return Promise.resolve(window.google.maps);
    }
    if (!GOOGLE_API_KEY) {
        return Promise.reject(new Error('No Google Maps API Key provided'));
    }
    if (googleMapsPromise) {
        return googleMapsPromise;
    }

    googleMapsPromise = new Promise((resolve, reject) => {
        const scriptId = 'google-maps-places-script';
        if (document.getElementById(scriptId)) {
            const checkInterval = setInterval(() => {
                if (window.google?.maps?.places) {
                    clearInterval(checkInterval);
                    resolve(window.google.maps);
                }
            }, 100);
            return;
        }

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_API_KEY)}&libraries=places&language=en&region=IN`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (window.google?.maps?.places) {
                resolve(window.google.maps);
            } else {
                reject(new Error('Google Maps loaded without Places library'));
            }
        };
        script.onerror = (err) => {
            console.warn('[PlacesService] Failed to load Google Maps SDK, falling back to OpenStreetMap.', err);
            reject(err);
        };
        document.head.appendChild(script);
    });

    return googleMapsPromise;
}

/**
 * Search places by text query.
 * Returns Array of: { id, displayName, name, subText, lat, lon, source: 'google' | 'photon' }
 */
export async function searchPlaces(query, { abortSignal = null } = {}) {
    const q = (query || '').trim();
    if (!q || q.length < 2) return [];

    // 1. Try Google Places Autocomplete first
    try {
        const maps = await loadGoogleMaps();
        if (maps?.places?.AutocompleteService) {
            const autocompleteService = new maps.places.AutocompleteService();
            const geocoder = new maps.Geocoder();

            const predictions = await new Promise((resolve, reject) => {
                autocompleteService.getPlacePredictions(
                    {
                        input: q,
                        componentRestrictions: { country: 'in' },
                    },
                    (results, status) => {
                        if (status === maps.places.PlacesServiceStatus.OK && results) {
                            resolve(results);
                        } else if (status === maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                            resolve([]);
                        } else {
                            reject(new Error(`Google Places Autocomplete failed with status: ${status}`));
                        }
                    }
                );
            });

            if (predictions && predictions.length > 0) {
                // Fetch geometry (lat/lng) for the top predictions in parallel (limit 5 for performance)
                const detailedResults = await Promise.all(
                    predictions.slice(0, 6).map(async (p) => {
                        try {
                            const geoRes = await new Promise((resGeo, rejGeo) => {
                                geocoder.geocode({ placeId: p.place_id }, (results, status) => {
                                    if (status === maps.GeocoderStatus.OK && results && results[0]) {
                                        resGeo(results[0]);
                                    } else {
                                        rejGeo(status);
                                    }
                                });
                            });

                            return {
                                id: p.place_id,
                                displayName: p.description,
                                name: p.structured_formatting?.main_text || p.description,
                                subText: p.structured_formatting?.secondary_text || '',
                                lat: geoRes.geometry.location.lat(),
                                lon: geoRes.geometry.location.lng(),
                                source: 'google',
                            };
                        } catch {
                            return null;
                        }
                    })
                );

                const valid = detailedResults.filter(Boolean);
                if (valid.length > 0) {
                    return valid;
                }
            }
        }
    } catch (err) {
        console.warn('[PlacesService] Google Places search unavailable, using Photon fallback:', err.message);
    }

    // 2. Fallback to Photon / OpenStreetMap
    try {
        const res = await fetch(`${PHOTON_SEARCH}?q=${encodeURIComponent(q)}&limit=10`, {
            signal: abortSignal,
            headers: { 'Accept-Language': 'en' },
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.features || []).map((f, i) => {
            const p = f.properties || {};
            const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean);
            return {
                id: `photon-${i}-${f.geometry.coordinates.join(',')}`,
                displayName: [...new Set(parts)].join(', '),
                name: p.name || parts[0] || 'Location',
                subText: parts.slice(1).join(', '),
                lat: parseFloat(f.geometry.coordinates[1]),
                lon: parseFloat(f.geometry.coordinates[0]),
                source: 'photon',
            };
        });
    } catch (err) {
        if (err.name === 'AbortError') return [];
        console.error('[PlacesService] Photon fallback failed:', err);
        return [];
    }
}

/**
 * Reverse geocode [lat, lon] coordinates to a human-readable address.
 */
export async function reverseGeocode(lat, lon) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '';

    // 1. Try Google Geocoder
    try {
        const maps = await loadGoogleMaps();
        if (maps?.Geocoder) {
            const geocoder = new maps.Geocoder();
            const result = await new Promise((resolve, reject) => {
                geocoder.geocode({ location: { lat, lng: lon } }, (results, status) => {
                    if (status === maps.GeocoderStatus.OK && results && results[0]) {
                        resolve(results[0].formatted_address);
                    } else {
                        reject(new Error(`Google Geocoder status: ${status}`));
                    }
                });
            });
            if (result) return result;
        }
    } catch (err) {
        // Fall through to Photon
    }

    // 2. Fallback to Photon Reverse
    try {
        const res = await fetch(`${PHOTON_REVERSE}?lat=${lat}&lon=${lon}`, {
            headers: { 'Accept-Language': 'en' },
        });
        if (res.ok) {
            const j = await res.json();
            if (j.features && j.features.length > 0) {
                const p = j.features[0].properties;
                const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean);
                return [...new Set(parts)].join(', ');
            }
        }
    } catch {}

    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}
