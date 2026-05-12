import React from 'react';
import { Clock3, MapPin, Store, Truck, Zap } from 'lucide-react';

const FulfillmentSelector = ({
    selected,
    onChange,
    selectedSlotId,
    onSlotChange,
    pickupSlots = [],
    scheduledSlots = [],
    expressServiceability = null,
    singleShopOrder = true,
}) => {
    const options = [
        {
            id: 'PICKUP',
            title: 'Self-Collect',
            description: singleShopOrder
                ? 'Pick up from the shop during an available slot.'
                : 'Pickup is only available when all items are from one shop.',
            icon: Store,
            priceLabel: 'Free',
            disabled: !singleShopOrder,
        },
        {
            id: 'SCHEDULED',
            title: 'Scheduled Delivery',
            description: 'Lower-cost routed delivery in your selected slot.',
            icon: Truck,
            priceLabel: scheduledSlots[0]?.deliveryCharge ? `From Rs ${scheduledSlots[0].deliveryCharge}` : 'Low cost',
            disabled: false,
        },
        {
            id: 'AGENT',
            title: 'Express Delivery',
            description: !singleShopOrder
                ? 'Express is available only for single-shop orders.'
                : expressServiceability?.serviceable
                    ? expressServiceability.message || 'Fast store-to-door delivery.'
                    : expressServiceability?.message || 'Checking availability for your area.',
            icon: Zap,
            priceLabel: expressServiceability?.deliveryCharge ? `Rs ${expressServiceability.deliveryCharge}` : 'Check availability',
            disabled: !singleShopOrder || (expressServiceability ? !expressServiceability.serviceable : true),
        },
    ];

    const slotOptions = selected === 'PICKUP' ? pickupSlots : selected === 'SCHEDULED' ? scheduledSlots : [];

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {options.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selected === option.id;

                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => !option.disabled && onChange(option.id)}
                            disabled={option.disabled}
                            className={`rounded-2xl border p-5 text-left transition ${
                                option.disabled
                                    ? 'cursor-not-allowed border-slate-200 bg-slate-100/60 text-slate-400'
                                    : isSelected
                                        ? 'border-primary bg-primary/5 shadow-sm'
                                        : 'border-slate-200 bg-white hover:border-primary/40 hover:shadow-sm'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className={`rounded-2xl p-3 ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'}`}>
                                    <Icon size={22} />
                                </div>
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    option.disabled
                                        ? 'bg-slate-200 text-slate-500'
                                        : 'bg-slate-900 text-white'
                                }`}>
                                    {option.priceLabel}
                                </span>
                            </div>

                            <div className="mt-4">
                                <p className={`text-lg font-bold ${option.disabled ? 'text-slate-500' : 'text-slate-900'}`}>{option.title}</p>
                                <p className="mt-2 text-sm leading-6">{option.description}</p>
                            </div>

                            {option.id === 'AGENT' && expressServiceability?.serviceable && (
                                <div className="mt-4 flex items-center gap-3 text-sm text-slate-600">
                                    <Clock3 className="h-4 w-4 text-primary" />
                                    <span>ETA ~{expressServiceability.estimatedMinutes} min</span>
                                    {expressServiceability.nearestShopName && (
                                        <>
                                            <MapPin className="h-4 w-4 text-primary" />
                                            <span>{expressServiceability.nearestShopName}</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {slotOptions.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-primary" />
                        <p className="font-semibold text-slate-900">
                            {selected === 'PICKUP' ? 'Choose a pickup slot' : 'Choose a delivery slot'}
                        </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {slotOptions.map((slot) => {
                            const active = selectedSlotId === slot.id;
                            return (
                                <button
                                    key={slot.id}
                                    type="button"
                                    onClick={() => slot.available && onSlotChange(slot.id)}
                                    disabled={!slot.available}
                                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                                        !slot.available
                                            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                            : active
                                                ? 'border-primary bg-white shadow-sm ring-2 ring-primary/10'
                                                : 'border-slate-200 bg-white hover:border-primary/30'
                                    }`}
                                >
                                    <p className="text-sm font-semibold text-slate-900">{slot.label}</p>
                                    <p className="mt-1 text-sm text-slate-600">{slot.displayWindow}</p>
                                    {slot.cutoffTime && (
                                        <p className="mt-2 text-xs text-slate-500">Cutoff {slot.cutoffTime}</p>
                                    )}
                                    {slot.deliveryCharge > 0 ? (
                                        <p className="mt-2 text-sm font-semibold text-primary">Rs {slot.deliveryCharge}</p>
                                    ) : (
                                        <p className="mt-2 text-sm font-semibold text-emerald-600">Free</p>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FulfillmentSelector;
