import React from 'react';
import { Heart, Plus, Star } from 'lucide-react';

const ProductCard = ({ product, onAddToCart, isWishlisted = false, onToggleWishlist = null }) => {
    const rating = product.rating || 4.5;
    const reviewCount = product.reviewCount || 0;
    const inStock = (product.stockQuantity || product.stock_qty || 0) > 0;

    return (
        <div className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group border border-gray-100">
            {/* Image Container */}
            <div className="relative h-56 overflow-hidden bg-gray-100">
                <img
                    src={product.imageUrl || product.image || 'https://via.placeholder.com/300x200?text=No+Image'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />

                {onToggleWishlist && (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onToggleWishlist(product);
                        }}
                        className={`absolute left-3 top-3 rounded-full p-2 shadow-sm backdrop-blur-sm transition ${
                            isWishlisted
                                ? 'bg-rose-100 text-rose-600'
                                : 'bg-white/90 text-gray-600 hover:bg-white'
                        }`}
                        aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
                    >
                        <Heart size={16} className={isWishlisted ? 'fill-current' : ''} />
                    </button>
                )}
                
                {/* Stock Badge */}
                {!inStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Out of Stock</span>
                    </div>
                )}
                
                {/* Stock Indicator */}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-gray-700">
                    {inStock ? `${product.stockQuantity || product.stock_qty || 0} left` : 'Sold out'}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col">
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 text-base">{product.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">{product.description || 'High quality product'}</p>

                {/* Rating */}
                {reviewCount > 0 && (
                    <div className="flex items-center gap-1 mb-3">
                        <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    size={14}
                                    className={i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-gray-600">({reviewCount})</span>
                    </div>
                )}

                {/* Price & Action */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                        <span className="text-lg font-bold text-primary">₹{product.price}</span>
                        {product.originalPrice && (
                            <span className="text-xs text-gray-500 line-through ml-2">₹{product.originalPrice}</span>
                        )}
                    </div>
                    <button
                        onClick={() => onAddToCart(product)}
                        disabled={!inStock}
                        className="p-2.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                        aria-label={`Add ${product.name} to cart`}
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
