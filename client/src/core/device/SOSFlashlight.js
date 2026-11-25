// core/device/SOSFlashlight.js
// Controls the physical native device flashlight to pulse Morse Code SOS
import { Torch } from '@capawesome/capacitor-torch';

// Morse Code SOS: ... --- ...
// dot = 200ms, dash = 600ms
const PATTERN = [
    200, 200, 200, 200, 200, 600, // S
    600, 200, 600, 200, 600, 600, // O
    200, 200, 200, 200, 200, 1400 // S
];

export const SOSFlashlight = {
    _isActive: false,
    _isAvailable: false,
    _initialized: false,

    async init() {
        if (this._initialized) return;
        try {
            // Request permissions first on Android 12+
            await Torch.requestPermissions().catch(() => { });
            const { isAvailable } = await Torch.isAvailable();
            this._isAvailable = isAvailable;
            this._initialized = true;
        } catch {
            this._isAvailable = false;
        }
    },

    async start() {
        await this.init();
        if (!this._isAvailable) {
            console.warn('[Flashlight] Native Torch not available on this device');
            return;
        }

        if (this._isActive) return;
        this._isActive = true;
        this._loopProcess();
    },

    stop() {
        this._isActive = false;
        if (this._isAvailable) {
            Torch.disable().catch(() => { });
        }
    },

    async _loopProcess() {
        let index = 0;
        let isOn = true;

        while (this._isActive) {
            try {
                if (isOn) {
                    await Torch.enable();
                } else {
                    await Torch.disable();
                }
            } catch (err) {
                console.warn('[Flashlight] Failed to toggle:', err);
                this.stop(); // Abort if hardware error
                break;
            }

            // Wait for the duration of the current morse symbol
            await new Promise(resolve => setTimeout(resolve, PATTERN[index]));

            if (!this._isActive) {
                await Torch.disable().catch(() => { });
                break;
            }

            isOn = !isOn;
            index++;

            // If we reached the end of the SOS pattern, reset
            if (index >= PATTERN.length) {
                index = 0;
                isOn = true;
            }
        }
    }
};
