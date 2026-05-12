import React from 'react';

const Card = ({ children, className = '', padding = 'md', onClick, ...props }) => {
    const baseStyles = 'bg-white rounded-xl border border-gray-100 shadow-sm transition-all duration-200';
    const hoverStyles = onClick ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : '';

    const paddings = {
        none: '',
        sm: 'p-3',
        md: 'p-5',
        lg: 'p-8',
    };

    return (
        <div
            className={`${baseStyles} ${hoverStyles} ${paddings[padding]} ${className}`}
            onClick={onClick}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
