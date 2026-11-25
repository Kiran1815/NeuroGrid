// hooks/useGeolocation.js
import { useState, useEffect } from 'react';

const DEFAULT_POS = { latitude: 17.385, longitude: 78.4867, accuracy: 0, heading: null, speed: null };

export function useGeolocation() {
    const [position, setPosition] = useState(DEFAULT_POS);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation not supported');
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            pos => setPosition({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                heading: pos.coords.heading,   // degrees from north (for compass)
                speed: pos.coords.speed,        // m/s (useful for moving rescuers)
            }),
            err => setError(err.message),
            {
                enableHighAccuracy: true,
                timeout: 15000,       // wait up to 15s for high-accuracy fix
                maximumAge: 0,        // never use cached position — always fresh
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // Expose lowAccuracy flag so UI can warn the user
    const lowAccuracy = position.accuracy > 30 && position.accuracy > 0;

    return { position, error, lowAccuracy };
}

