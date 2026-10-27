import React, { useEffect } from 'react';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

const getZoom = (radiusKm) => (radiusKm <= 2 ? 14 : radiusKm <= 5 ? 12 : radiusKm <= 10 ? 11 : 10);

const MapViewport = ({ location, radiusKm }) => {
    const map = useMap();

    useEffect(() => {
        map.setView([location.lat, location.lon], getZoom(radiusKm));
    }, [location.lat, location.lon, map, radiusKm]);

    return null;
};

const DiscoveryMap = ({ shops, location, radiusKm }) => {
    const mappedShops = shops.filter((shop) => (
        shop.latitude != null
        && shop.longitude != null
        && Number.isFinite(Number(shop.latitude))
        && Number.isFinite(Number(shop.longitude))
    ));

    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                <div>
                    <h3 className="font-semibold text-slate-900">Shop map</h3>
                    <p className="text-sm text-slate-500">
                        {mappedShops.length} of {shops.length} shops have map locations
                    </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                    {radiusKm} km search radius
                </span>
            </div>
            <MapContainer
                center={[location.lat, location.lon]}
                zoom={getZoom(radiusKm)}
                scrollWheelZoom={false}
                className="h-[420px] w-full"
            >
                <MapViewport location={location} radiusKm={radiusKm} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Circle
                    center={[location.lat, location.lon]}
                    radius={radiusKm * 1000}
                    pathOptions={{ color: '#4f46e5', fillColor: '#6366f1', fillOpacity: 0.08, weight: 2 }}
                >
                    <Popup>Your selected search radius</Popup>
                </Circle>
                <CircleMarker
                    center={[location.lat, location.lon]}
                    radius={8}
                    pathOptions={{ color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }}
                >
                    <Popup>Your search location</Popup>
                </CircleMarker>
                {mappedShops.map((shop) => (
                    <CircleMarker
                        key={shop.id}
                        center={[Number(shop.latitude), Number(shop.longitude)]}
                        radius={8}
                        pathOptions={{ color: '#fff', weight: 2, fillColor: '#ea580c', fillOpacity: 0.95 }}
                    >
                        <Popup>
                            <div className="min-w-36">
                                <p className="font-semibold">{shop.name}</p>
                                {shop.category && <p className="text-sm text-slate-600">{shop.category}</p>}
                                {shop.address && <p className="mt-1 text-xs text-slate-500">{shop.address}</p>}
                                <Link className="mt-2 inline-block font-semibold text-indigo-600" to={`/shop/${shop.id}`}>
                                    View shop
                                </Link>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>
            {mappedShops.length < shops.length && (
                <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
                    Shops without saved coordinates are still available in the results below.
                </p>
            )}
        </div>
    );
};

export default DiscoveryMap;
