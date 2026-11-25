// hooks/useBattery.js
import { useState, useEffect } from 'react';

export function useBattery() {
    const [battery, setBattery] = useState({ level: 100, charging: false });

    useEffect(() => {
        let batteryObj = null;

        async function init() {
            if ('getBattery' in navigator) {
                try {
                    batteryObj = await navigator.getBattery();
                    const update = () => setBattery({
                        level: Math.round(batteryObj.level * 100),
                        charging: batteryObj.charging,
                    });
                    update();
                    batteryObj.addEventListener('levelchange', update);
                    batteryObj.addEventListener('chargingchange', update);
                } catch {
                    // getBattery not available
                }
            }
        }

        init();
        return () => {
            batteryObj?.removeEventListener('levelchange', () => { });
            batteryObj?.removeEventListener('chargingchange', () => { });
        };
    }, []);

    return battery;
}
