// components/SOSButton.jsx
import { useState, useRef, useEffect } from 'react';

const HOLD_DURATION = 2000; // ms

export function SOSButton({ onActivate, onDeactivate, active: externalActive = false }) {
    const [pressed, setPressed] = useState(false);
    const [active, setActive] = useState(externalActive);
    const [progress, setProgress] = useState(0);
    const holdTimer = useRef(null);
    const progTimer = useRef(null);

    useEffect(() => {
        if (externalActive) setActive(true);
    }, [externalActive]);

    const handlePressStart = (e) => {
        e.preventDefault();
        setPressed(true);
        setProgress(0);

        // Animate progress ring
        const startTime = Date.now();
        progTimer.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            setProgress(Math.min(elapsed / HOLD_DURATION, 1));
        }, 30);

        holdTimer.current = setTimeout(() => {
            clearInterval(progTimer.current);
            setProgress(1);

            if (active) {
                setActive(false);
                navigator.vibrate?.([100, 50, 100]);
                onDeactivate?.();
            } else {
                setActive(true);
                navigator.vibrate?.([200, 100, 200, 100, 400]);
                onActivate?.();
            }
        }, HOLD_DURATION);
    };

    const handlePressEnd = () => {
        setPressed(false);
        setProgress(0);
        clearTimeout(holdTimer.current);
        clearInterval(progTimer.current);
    };

    const circumference = 502;
    const dashOffset = circumference - progress * circumference;

    return (
        <button
            className={`sos-btn ${pressed ? 'sos-btn--pressing' : ''} ${active ? 'sos-btn--active' : ''}`}
            onPointerDown={handlePressStart}
            onPointerUp={handlePressEnd}
            onPointerLeave={handlePressEnd}
            aria-label="Send SOS emergency signal — hold for 2 seconds"
        >
            <span className="sos-btn__label">SOS</span>

            {/* Progress ring while pressing */}
            {pressed && (
                <svg
                    className="sos-btn__progress"
                    viewBox="0 0 180 180"
                    style={{ position: 'absolute', inset: '-10px', width: 'calc(100% + 20px)', height: 'calc(100% + 20px)', pointerEvents: 'none' }}
                >
                    <circle
                        cx="90" cy="90" r="80"
                        fill="none"
                        stroke="#E74C3C"
                        strokeWidth="4"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        transform="rotate(-90 90 90)"
                    />
                </svg>
            )}

            {active && (
                <>
                    <span className="sos-btn__ring" aria-hidden />
                    <span className="sos-btn__ring-2" aria-hidden />
                </>
            )}
        </button>
    );
}
