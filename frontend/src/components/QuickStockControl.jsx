import React, { useState, useEffect } from 'react';
import { Plus, Minus, Check, Loader2 } from 'lucide-react';

const QuickStockControl = ({ productId, initialStock, onUpdate }) => {
    const [stock, setStock] = useState(initialStock);
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setStock(initialStock);
    }, [initialStock]);

    // Optimistic update
    const updateStock = async (newStock) => {
        setLoading(true);
        setSaved(false);
        try {
            await onUpdate(productId, newStock);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            console.error("Failed to update stock", e);
            setStock(initialStock); // Revert
        } finally {
            setLoading(false);
        }
    };

    // Debounce the actual API call if users click rapidly (optional, but good for heavy clicking)
    // For now, let's do direct calls to ensure consistency or implement a simple buffer.
    // Actually, for +/- buttons, direct optimistic interaction feels better.

    const increment = () => {
        const newStock = stock + 1;
        setStock(newStock);
        updateStock(newStock);
    };

    const decrement = () => {
        if (stock <= 0) return;
        const newStock = stock - 1;
        setStock(newStock);
        updateStock(newStock);
    };

    return (
        <div className="flex items-center space-x-3" data-testid="quick-stock-control">
            <button
                onClick={decrement}
                disabled={loading || stock <= 0}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-50 transition-colors"
                data-testid="decrement-btn"
            >
                <Minus size={14} />
            </button>

            <div className="w-12 text-center font-bold text-gray-900 relative" data-testid="stock-value">
                {stock}
                {loading && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Loader2 size={12} className="animate-spin text-primary" />
                    </div>
                )}
                {saved && !loading && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Check size={12} className="text-green-500" />
                    </div>
                )}
            </div>

            <button
                onClick={increment}
                disabled={loading}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                data-testid="increment-btn"
            >
                <Plus size={14} />
            </button>
        </div>
    );
};

export default QuickStockControl;
