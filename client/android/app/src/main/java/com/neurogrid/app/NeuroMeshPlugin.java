package com.neurogrid.app;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.content.Context;
import android.os.ParcelUuid;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import android.Manifest;
import android.os.Build;

import java.util.UUID;

@CapacitorPlugin(
    name = "NeuroMesh",
    permissions = {
        @Permission(
            alias = "advertise",
            strings = {
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        )
    }
)
public class NeuroMeshPlugin extends Plugin {

    private static final String TAG = "NeuroMeshPlugin";
    // Must match the SERVICE_UUID used in NativeMeshManager.js for scanning
    private static final String MESH_SERVICE_UUID = "0000FF01-0000-1000-8000-00805F9B34FB";
    
    private BluetoothManager bluetoothManager;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothLeAdvertiser bluetoothLeAdvertiser;
    private AdvertiseCallback advertiseCallback;
    private boolean isAdvertising = false;

    @Override
    public void load() {
        super.load();
        bluetoothManager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        if (bluetoothManager != null) {
            bluetoothAdapter = bluetoothManager.getAdapter();
        }
    }

    @PluginMethod
    public void startAdvertising(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!hasRequiredPermissions()) {
                requestAllPermissions(call, "advertisingPermsCallback");
                return;
            }
        }
        
        executeAdvertisement(call);
    }

    @PermissionCallback
    private void advertisingPermsCallback(PluginCall call) {
        if (hasRequiredPermissions()) {
            executeAdvertisement(call);
        } else {
            call.reject("Permission denied for BLE Advertising. Mesh will not form.");
        }
    }

    private void executeAdvertisement(PluginCall call) {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is disabled or not available on this device.");
            return;
        }

        bluetoothLeAdvertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
        if (bluetoothLeAdvertiser == null) {
            call.reject("BLE Advertising is not supported by this device hardware.");
            return;
        }

        // The JavaScript layer sends us a base64 encoded string of the compressed 16-byte payload
        String base64Data = call.getString("data");
        if (base64Data == null) {
            call.reject("No data provided to advertise.");
            return;
        }

        byte[] payload;
        try {
            payload = Base64.decode(base64Data, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            call.reject("Invalid base64 payload.");
            return;
        }

        // Limit payload size to standard BLE advertising packet limits to guarantee delivery
        if (payload.length > 24) {
             Log.w(TAG, "Payload is larger than expected BLE mesh packet size. Truncating.");
             byte[] truncated = new byte[24];
             System.arraycopy(payload, 0, truncated, 0, 24);
             payload = truncated;
        }

        if (isAdvertising && advertiseCallback != null) {
            bluetoothLeAdvertiser.stopAdvertising(advertiseCallback);
            isAdvertising = false;
        }

        AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(false) // Pure broadcast, no connections needed
                .build();

        ParcelUuid pUuid = new ParcelUuid(UUID.fromString(MESH_SERVICE_UUID));

        AdvertiseData data = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(false)
                .addServiceUuid(pUuid)
                .build();
                
        AdvertiseData scanResponse = new AdvertiseData.Builder()
                .addManufacturerData(0xFFFF, payload)
                .build();

        advertiseCallback = new AdvertiseCallback() {
            @Override
            public void onStartSuccess(AdvertiseSettings settingsInEffect) {
                isAdvertising = true;
                Log.i(TAG, "BLE Advertising started successfully.");
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            }

            @Override
            public void onStartFailure(int errorCode) {
                isAdvertising = false;
                Log.e(TAG, "BLE Advertising failed with error code: " + errorCode);
                call.reject("BLE Advertising failed to start. Error code: " + errorCode);
            }
        };

        Log.i(TAG, "Starting BLE broadcast with NeuroGrid Mesh Payload...");
        try {
            // Requires BLUETOOTH_ADVERTISE permissions on Android 12+, which we added previously
            bluetoothLeAdvertiser.startAdvertising(settings, data, scanResponse, advertiseCallback);
        } catch (SecurityException e) {
            Log.e(TAG, "SecurityException: Missing required Bluetooth permissions.");
            call.reject("Missing required Bluetooth permissions: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopAdvertising(PluginCall call) {
        if (!isAdvertising || bluetoothLeAdvertiser == null || advertiseCallback == null) {
            Log.i(TAG, "Already stopped or advertiser not initialized.");
            call.resolve();
            return;
        }

        try {
            bluetoothLeAdvertiser.stopAdvertising(advertiseCallback);
            isAdvertising = false;
            advertiseCallback = null;
            Log.i(TAG, "BLE Advertising stopped.");
            call.resolve();
        } catch (SecurityException e) {
            Log.e(TAG, "SecurityException while stopping advertising.");
            call.reject("Missing permissions to stop advertising.");
        }
    }
}
