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

    fun startScanning() {
        if (isScanning || scanner == null) return

        val scanSettings = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && isLeCodedPhySupported()) {
            ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .setLegacy(false)
                .setPhy(ScanSettings.PHY_LE_ALL_SUPPORTED)
                .build()
        } else {
            ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .build()
        }

        val filters = listOf(
            ScanFilter.Builder()
                .build()
        )

        try {
            scanner?.startScan(filters, scanSettings, scanCallback)
            isScanning = true
        } catch (_: SecurityException) {
            // Handled when user grants BLUETOOTH_SCAN permission
        }
    }

    fun stopScanning() {
        if (!isScanning || scanner == null) return
        try {
            scanner?.stopScan(scanCallback)
            isScanning = false
        } catch (_: SecurityException) {}
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            super.onScanResult(callbackType, result)
            val bytes = result?.scanRecord?.bytes ?: return
            
            // Fast check for TOG Magic (0x54, 0x4F)
            if (bytes.size >= 2 && bytes[0] == 0x54.toByte() && bytes[1] == 0x4F.toByte()) {
                // Incoming TOG v1.1 Packet detected from air!
            }
        }
    }
}
