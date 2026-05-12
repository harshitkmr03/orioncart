import React, { useState, useEffect } from 'react';
import { shopAPI } from '../services/api';
import { supabaseApi } from '../services/supabaseApi';

function TestConnection() {
    const [status, setStatus] = useState('Testing connection...');
    const [shops, setShops] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        testConnection();
    }, []);

    const testConnection = async () => {
        try {
            setStatus('Fetching shops from Supabase via backend...');
            // prefer supabase-backed endpoint to verify integration
            const data = await supabaseApi.getShops();
            setShops(data);
            setStatus('✅ Connection successful! (Supabase data)');
            setError(null);
        } catch (err) {
            // fallback to existing backend endpoint if supabase route fails
            try {
                setStatus('Supabase fetch failed, falling back to regular backend...');
                const data = await shopAPI.getAllShops();
                setShops(data);
                setStatus('✅ Connection successful! (regular backend)');
                setError(null);
            } catch (err2) {
                setStatus('❌ Connection failed');
                setError(err2.message || err.message);
            }
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>Backend Connection Test</h1>
            <div style={{
                padding: '15px',
                marginBottom: '20px',
                backgroundColor: error ? '#ffebee' : '#e8f5e9',
                borderRadius: '8px'
            }}>
                <h2>{status}</h2>
                {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            </div>

            {shops.length > 0 && (
                <div>
                    <h3>Shops from Backend ({shops.length}):</h3>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {shops.map((shop) => (
                            <div
                                key={shop.id}
                                style={{
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px'
                                }}
                            >
                                <strong>{shop.name}</strong> - {shop.category}
                                <br />
                                <small>{shop.description}</small>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <button
                onClick={testConnection}
                style={{
                    marginTop: '20px',
                    padding: '10px 20px',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                Test Again
            </button>
        </div>
    );
}

export default TestConnection;
