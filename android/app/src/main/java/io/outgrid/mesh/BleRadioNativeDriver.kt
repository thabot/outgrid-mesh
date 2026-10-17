package io.outgrid.mesh

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Build

/**
 * Android Native BLE Radio Driver
 * Implements Bluetooth 5 LE Coded PHY (S=8) with 1M PHY Fallback
 * Hardware filtering on TOG Magic 0x544F
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Radio Driver
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
object BleRadioNativeDriver {

    private var bluetoothAdapter: BluetoothAdapter? = null
    private var scanner: BluetoothLeScanner? = null
    private var isScanning = false

    fun initialize(context: Context) {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = manager?.adapter
        scanner = bluetoothAdapter?.bluetoothLeScanner
    }

    fun isLeCodedPhySupported(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            bluetoothAdapter?.isLeCodedPhySupported == true
        } else {
            false
        }
    }

    private var primaryListener: ((bytes: ByteArray, rssi: Int) -> Unit)? = null
    private val packetListeners = java.util.concurrent.CopyOnWriteArraySet<(bytes: ByteArray, rssi: Int) -> Unit>()
    private var lastScanEventTimestamp: Long = System.currentTimeMillis()
    private val watchdogHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private val WATCHDOG_INTERVAL_MS = 15 * 60 * 1000L // 15-minute Watchdog cycle

    fun addPacketListener(listener: (bytes: ByteArray, rssi: Int) -> Unit) {
        this.packetListeners.add(listener)
    }

    fun removePacketListener(listener: (bytes: ByteArray, rssi: Int) -> Unit) {
        this.packetListeners.remove(listener)
    }

    fun setPacketListener(listener: ((bytes: ByteArray, rssi: Int) -> Unit)?) {
        primaryListener?.let { this.packetListeners.remove(it) }
        primaryListener = listener
        if (listener != null) {
            this.packetListeners.add(listener)
        }
    }

    private val watchdogRunnable = object : Runnable {
        override fun run() {
            if (isScanning) {
                val idleTime = System.currentTimeMillis() - lastScanEventTimestamp
                // If silent Bluetooth freeze detected (> 15 min without any scan event)
                if (idleTime > WATCHDOG_INTERVAL_MS) {
                    android.util.Log.w("OutGridBLE", "Watchdog: Silent Bluetooth freeze suspected. Refreshing scanner...")
                    stopScanning()
                    startScanning()
                }
            }
            watchdogHandler.postDelayed(this, WATCHDOG_INTERVAL_MS)
        }
    }

    // Service UUID: 0x544F ('TO' in ASCII) matching TOG v1.1 Wire Specification & UpgardBT
    private val TOG_SERVICE_UUID = java.util.UUID.fromString("0000544f-0000-1000-8000-00805f9b34fb")
    private val TOG_PARCEL_UUID = android.os.ParcelUuid(TOG_SERVICE_UUID)
    private const val TOG_MANUFACTURER_ID = 0x544F

    fun startScanning(lowLatency: Boolean = false) {
        if (isScanning || scanner == null) return

        val scanMode = if (lowLatency) {
            ScanSettings.SCAN_MODE_LOW_LATENCY
        } else {
            ScanSettings.SCAN_MODE_BALANCED
        }

        val scanSettings = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && isLeCodedPhySupported()) {
            ScanSettings.Builder()
                .setScanMode(scanMode)
                .setLegacy(false)
                .setPhy(ScanSettings.PHY_LE_ALL_SUPPORTED)
                .build()
        } else {
            ScanSettings.Builder()
                .setScanMode(scanMode)
                .build()
        }

        // Hardware ScanFilter strictly targeting TOG Service UUID & Manufacturer Data (Removes CPU-draining open filter)
        val filters = listOf(
            ScanFilter.Builder().setServiceUuid(TOG_PARCEL_UUID).build(),
            ScanFilter.Builder().setManufacturerData(TOG_MANUFACTURER_ID, byteArrayOf()).build()
        )

        try {
            scanner?.startScan(filters, scanSettings, scanCallback)
            isScanning = true
            lastScanEventTimestamp = System.currentTimeMillis()
            watchdogHandler.postDelayed(watchdogRunnable, WATCHDOG_INTERVAL_MS)
        } catch (_: SecurityException) {
            // Handled when user grants BLUETOOTH_SCAN permission
        }
    }

    fun stopScanning() {
        watchdogHandler.removeCallbacks(watchdogRunnable)
        if (!isScanning || scanner == null) return
        try {
            scanner?.stopScan(scanCallback)
            isScanning = false
        } catch (_: SecurityException) {}
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            super.onScanResult(callbackType, result)
            lastScanEventTimestamp = System.currentTimeMillis()
            val record = result?.scanRecord ?: return
            val rssi = result.rssi

            // 1. Check Service Data for TOG_PARCEL_UUID (Standard Android BLE transport)
            val serviceData = record.getServiceData(TOG_PARCEL_UUID)
            if (serviceData != null && serviceData.isNotEmpty()) {
                packetListeners.forEach { it.invoke(serviceData, rssi) }
                return
            }

            // 2. Check Manufacturer Data for TOG_MANUFACTURER_ID (0x544F)
            val mfgData = record.getManufacturerSpecificData(TOG_MANUFACTURER_ID)
            if (mfgData != null && mfgData.isNotEmpty()) {
                packetListeners.forEach { it.invoke(mfgData, rssi) }
                return
            }

            // 3. Raw AD payload scan: Search for TOG Magic (0x54, 0x4F) in advertising byte stream
            val rawBytes = record.bytes ?: return
            if (rawBytes.size >= 2) {
                // Direct index 0 check
                if (rawBytes[0] == 0x54.toByte() && rawBytes[1] == 0x4F.toByte()) {
                    packetListeners.forEach { it.invoke(rawBytes, rssi) }
                    return
                }

                // Search inside AD structure blocks for Magic 0x544F
                for (i in 0 until (rawBytes.size - 4)) {
                    if (rawBytes[i] == 0x54.toByte() && rawBytes[i + 1] == 0x4F.toByte()) {
                        val packetSlice = rawBytes.copyOfRange(i, rawBytes.size)
                        packetListeners.forEach { it.invoke(packetSlice, rssi) }
                        return
                    }
                }
            }
        }
    }
}
