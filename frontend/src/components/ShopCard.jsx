import React from 'react';
import { Link } from 'react-router-dom';
import { Clock3, MapPin, Sparkles, Star } from 'lucide-react';

const ShopCard = ({ shop }) => {
    const distance = typeof shop.distanceKm === 'number'
        ? `${shop.distanceKm.toFixed(1)} km`
        : shop.distance
            ? (typeof shop.distance === 'number' ? `${shop.distance.toFixed(1)} km` : shop.distance)
            : 'Nearby';

    const eta = shop.etaMinutes ? `~${shop.etaMinutes} min` : 'ETA soon';
    const statusLabel = shop.statusLabel || (shop.isOpen === false ? 'Closed now' : shop.isOpen === true ? 'Open now' : 'Hours unavailable');
    const ratingLabel = typeof shop.rating === 'number' ? shop.rating.toFixed(1) : 'New';
    const reviewLabel = shop.reviewCount ? `${shop.reviewCount} reviews` : 'No reviews yet';
    const deliveryModes = ['Pickup', 'Scheduled'];

    if (shop.etaMinutes) {
        deliveryModes.push('Express');
    }

    return (
        <Link
            to={`/shop/${shop.id}`}
            className="group block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
            <div className="relative h-56 overflow-hidden">
                <img
                    src={shop.image || 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=1000'}
                    alt={shop.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />

                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 backdrop-blur">
                        {shop.category || 'Local shop'}
                    </span>
                    <span className="rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                        {eta}
                    </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
                    <div>
                        <p className="text-2xl font-bold">{shop.name}</p>
                        <p className="mt-1 line-clamp-1 text-sm text-white/80">{shop.address || 'Address coming soon'}</p>
                    </div>
                    <div className="rounded-2xl bg-white/15 px-3 py-2 text-right backdrop-blur">
                        <p className="text-xs uppercase tracking-wide text-white/70">Distance</p>
                        <p className="text-sm font-semibold">{distance}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-semibold">{ratingLabel}</span>
                    </div>
                    <div className="text-slate-500">{reviewLabel}</div>
                </div>

                <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{distance}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-primary" />
                        <span>{statusLabel}</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {deliveryModes.map((mode) => (
                        <span key={mode} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {mode}
                        </span>
                    ))}
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Express estimate</p>
                        <p className="text-sm font-semibold text-slate-900">{eta}</p>
                    </div>
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                        <Sparkles className="h-4 w-4" />
                        View shop
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default ShopCard;
