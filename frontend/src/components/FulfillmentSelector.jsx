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
    onSwitchToTomorrow = null,
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

    React.useEffect(() => {
        if ((selected === 'PICKUP' || selected === 'SCHEDULED') && onSlotChange) {
            const currentSlots = (slotOptions && slotOptions.length > 0) ? slotOptions : [
                { id: selected === 'PICKUP' ? 'pickup-m' : 'sched-m' }
            ];
            if (!selectedSlotId || !currentSlots.some((s) => s.id === selectedSlotId)) {
                onSlotChange(currentSlots[0].id);
            }
        }
    }, [selected, selectedSlotId, slotOptions, onSlotChange]);

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

            {selected !== 'AGENT' && (
                (() => {
                    const fallbackSlots = selected === 'PICKUP' ? [
                        { id: 'pickup-m', label: 'Morning Pickup', displayWindow: '10:00 AM - 1:00 PM', available: true, deliveryCharge: 0 },
                        { id: 'pickup-a', label: 'Afternoon Pickup', displayWindow: '1:00 PM - 5:00 PM', available: true, deliveryCharge: 0 },
                        { id: 'pickup-e', label: 'Evening Pickup', displayWindow: '5:00 PM - 9:00 PM', available: true, deliveryCharge: 0 },
                    ] : [
                        { id: 'sched-m', label: 'Morning Delivery', displayWindow: '9:00 AM - 12:00 PM', available: true, deliveryCharge: 15 },
                        { id: 'sched-a', label: 'Afternoon Delivery', displayWindow: '12:00 PM - 4:00 PM', available: true, deliveryCharge: 15 },
                        { id: 'sched-e', label: 'Evening Delivery', displayWindow: '4:00 PM - 8:00 PM', available: true, deliveryCharge: 20 },
                        { id: 'sched-n', label: 'Night Delivery', displayWindow: '8:00 PM - 11:00 PM', available: true, deliveryCharge: 25 },
                    ];

                    const displaySlots = (slotOptions && slotOptions.length > 0) ? slotOptions : fallbackSlots;

                    return (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock3 className="h-4 w-4 text-primary" />
                                    <p className="font-semibold text-slate-900">
                                        {selected === 'PICKUP' ? 'Choose a pickup slot' : 'Choose a delivery slot'}
                                    </p>
                                </div>
                                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                    All slots available
                                </span>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {displaySlots.map((slot) => {
                                    const active = selectedSlotId === slot.id;
                                    return (
                                        <button
                                            key={slot.id}
                                            type="button"
                                            onClick={() => onSlotChange(slot.id)}
                                            className={`rounded-2xl border px-4 py-3 text-left transition cursor-pointer ${
                                                active
                                                    ? 'border-primary bg-white shadow-sm ring-2 ring-primary/20'
                                                    : 'border-slate-200 bg-white hover:border-primary/40 hover:shadow-xs'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold text-slate-900">{slot.label}</p>
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                                    Available
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-slate-600">{slot.displayWindow}</p>
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
                    );
                })()
            )}
        </div>
    );
};

export default FulfillmentSelector;
