// hooks/usePWAInstall.js
// Platform-aware PWA install hook.
// - Android Chrome: uses globally captured beforeinstallprompt (set in index.html)
// - iOS Safari: shows manual "Add to Home Screen" instructions
// - Already installed: hides the button

import { useState, useEffect } from 'react';

function detectPlatform() {
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/chrome/i.test(ua);
    const isChrome = /chrome/i.test(ua) && !/edg/i.test(ua);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
    return { isIOS, isAndroid, isSafari, isChrome, isStandalone };
}

export function usePWAInstall() {
    const platform = detectPlatform();
    const [hasNativePrompt, setHasNativePrompt] = useState(!!window.__pwaInstallEvent);
    const [isInstalled, setIsInstalled] = useState(platform.isStandalone);
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    useEffect(() => {
        if (platform.isStandalone) return;

        // Check if event already captured before React mounted
        if (window.__pwaInstallEvent) {
            setHasNativePrompt(true);
        }

        // Listen for future captures (if event fires after React mounts)
        const onReady = () => setHasNativePrompt(true);
        const onInstalled = () => { setIsInstalled(true); setHasNativePrompt(false); };

        window.addEventListener('pwa-install-ready', onReady);
        window.addEventListener('pwa-installed', onInstalled);

        return () => {
            window.removeEventListener('pwa-install-ready', onReady);
            window.removeEventListener('pwa-installed', onInstalled);
        };
    }, [platform.isStandalone]);

    const promptInstall = async () => {
        if (platform.isIOS) {
            // iOS Safari cannot use beforeinstallprompt — show manual guide
            setShowIOSGuide(true);
            return;
        }
        const evt = window.__pwaInstallEvent;
        if (!evt) return;
        evt.prompt();
        const { outcome } = await evt.userChoice;
        if (outcome === 'accepted') {
            window.__pwaInstallEvent = null;
            setHasNativePrompt(false);
            setIsInstalled(true);
        }
    };

    // Show install button if:
    // - Not already installed
    // - Either: has native Android prompt OR is iOS (always show for manual guide)
    const canInstall = !isInstalled && (hasNativePrompt || platform.isIOS);

    return {
        canInstall,
        isInstalled,
        promptInstall,
        showIOSGuide,
        closeIOSGuide: () => setShowIOSGuide(false),
        platform,
    };
}
