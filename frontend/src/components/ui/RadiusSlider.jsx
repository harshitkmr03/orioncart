import React from 'react';

const RadiusSlider = ({ value, onChange, min = 1, max = 20, step = 1 }) => {
    return (
        <div className="w-full max-w-xs">
            <div className="flex justify-between items-center mb-2">
                <label htmlFor="radius-slider" className="text-sm font-medium text-gray-700">
                    Search Radius
                </label>
                <span className="text-sm font-bold text-primary">
                    {value} km
                </span>
            </div>
            <input
                id="radius-slider"
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{min}km</span>
                <span>{max}km</span>
            </div>
        </div>
    );
};

export default RadiusSlider;
