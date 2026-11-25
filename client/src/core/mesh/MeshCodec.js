// core/mesh/MeshCodec.js
// Compresses JSON SOS payload into a 16-byte binary ArrayBuffer for BLE advertising

const PRIORITIES = { LOW: 0, MEDIUM: 1, CRITICAL: 2 };
const PRIORITIES_REV = ['LOW', 'MEDIUM', 'CRITICAL'];

export const MeshCodec = {
    /**
     * @param {Object} survivor { device_id, latitude, longitude, priority:{level}, battery_level }
     * @param {number} hopCount
     * @param {number} messageId (0-255 rolling counter)
     * @returns {DataView} 16-byte DataView for BLE plugin
     */
    encodeSOS(survivor, hopCount, messageId) {
        const buffer = new ArrayBuffer(16);
        const view = new DataView(buffer);

        // 1. Device ID (4 bytes) - parses '1A2B3C4D' -> 32-bit uint
        const cleanId = (survivor.device_id || '00000000').replace('NG-', '').slice(0, 8);
        const idInt = parseInt(cleanId, 16);
        view.setUint32(0, isNaN(idInt) ? 0 : idInt, true); // Little endian

        // 2. Lat/Lng (8 bytes)
        view.setFloat32(4, survivor.latitude || 0, true);
        view.setFloat32(8, survivor.longitude || 0, true);

        // 3. Priority + Battery (2 bytes)
        const priorityVal = PRIORITIES[survivor.priority?.level] ?? 0;
        view.setUint8(12, priorityVal);
        view.setUint8(13, survivor.battery_level ?? 100);

        // 4. Routing (2 bytes)
        view.setUint8(14, hopCount);
        view.setUint8(15, messageId);

        return view;
    },

    /**
     * @param {DataView} view 16-byte DataView
     * @returns {Object} Extracted custom JSON payload compatible with app schemas
     */
    decodeSOS(view) {
        if (view.byteLength !== 16) {
            console.warn(`[MeshCodec] Decode failed = ByteLength was ${view.byteLength}, expected 16`);
            return null;
        }

        // 1. Device ID (4 bytes) back to Hex String '1A2B3C4D'
        const idInt = view.getUint32(0, true);
        const device_id = idInt.toString(16).padStart(8, '0').toUpperCase();

        const latitude = view.getFloat32(4, true);
        const longitude = view.getFloat32(8, true);

        const priorityVal = view.getUint8(12);
        const priorityLevel = PRIORITIES_REV[priorityVal] || 'LOW';
        const battery_level = view.getUint8(13);

        const hop_count = view.getUint8(14);
        const message_id = view.getUint8(15);

        // Reconstruct exact payload structure useMesh expects
        return {
            type: 'sos',
            device_id,
            latitude,
            longitude,
            priority: { level: priorityLevel },
            battery_level,
            hop_count,
            message_id,
            timestamp: Date.now()
        };
    }
};
