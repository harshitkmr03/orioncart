import React from 'react';

const RadiusSlider = ({ value = 5, onChange }) => {
    return (
        <div className="flex items-center gap-3">
            <input type="range" min="1" max="20" value={value} onChange={e => onChange(Number(e.target.value))} />
            <div className="text-sm">{value} km</div>
        </div>
    );
};

export default RadiusSlider;
