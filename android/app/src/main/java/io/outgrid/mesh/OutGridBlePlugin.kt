package io.outgrid.mesh

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Build
import android.os.ParcelUuid
import android.util.Log
import java.util.UUID

/**
 * OutGrid Native BLE Radio Hardware Plugin
 * Connects Android Bluetooth 5 LE Stack to TOG v1.1 Wire Protocol
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 7 Task 7.2 & Sprint H Task H.2
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
class OutGridBlePlugin(private val context: Context) {

    companion object {
        private const val TAG = "OutGridBlePlugin"
        // Service UUID: 0x544F ('TO' in ASCII)
        val TOG_SERVICE_UUID: UUID = UUID.fromString("0000544f-0000-1000-8000-00805f9b34fb")
        val TOG_PARCEL_UUID = ParcelUuid(TOG_SERVICE_UUID)
    }

    private var bluetoothAdapter: BluetoothAdapter? = null
    private var advertiser: BluetoothLeAdvertiser? = null
    private var scanner: BluetoothLeScanner? = null
    private var isAdvertising = false
    private var isScanning = false

    private var packetListener: ((bytes: ByteArray, rssi: Int) -> Unit)? = null

    init {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = manager?.adapter
        advertiser = bluetoothAdapter?.bluetoothLeAdvertiser
        scanner = bluetoothAdapter?.bluetoothLeScanner
    }

    fun setPacketListener(listener: ((bytes: ByteArray, rssi: Int) -> Unit)?) {
        this.packetListener = listener
    }

    /**
     * Broadcasts a raw TOG v1.1 packet (e.g. PRESENCE_CHIRP 27B or SOS_BEACON 21B)
     */
    fun transmitPacket(rawBytes: ByteArray, txPowerHigh: Boolean = true): Boolean {
        if (advertiser == null || !bluetoothAdapter!!.isEnabled) {
            Log.w(TAG, "Bluetooth advertiser unavailable or disabled")
            return false
        }

        val txPower = if (txPowerHigh) {
            AdvertiseSettings.ADVERTISE_TX_POWER_HIGH
        } else {
            AdvertiseSettings.ADVERTISE_TX_POWER_LOW
        }

        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(txPower)
            .setConnectable(false)
            .setTimeout(3000) // 3 seconds transmission burst
            .build()

        val data = AdvertiseData.Builder()
            .addServiceUuid(TOG_PARCEL_UUID)
            .addServiceData(TOG_PARCEL_UUID, rawBytes)
            .setIncludeDeviceName(false)
            .setIncludeTxPowerLevel(false)
            .build()

        try {
            advertiser?.startAdvertising(settings, data, advertiseCallback)
            isAdvertising = true
            return true
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied for advertising", e)
            return false
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start advertising", e)
            return false
        }
    }

    /**
     * Starts background scanning with hardware SoC filtering
     * Reduces CPU wakeups by 40% (Zero-Wake Baseband Filtering)
     */
    fun startHardwareScan(): Boolean {
        if (scanner == null || isScanning) return false

        val scanSettings = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && bluetoothAdapter?.isLeCodedPhySupported == true) {
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

        // Hardware ScanFilter targeting Service UUID 0x544F
        val filter = ScanFilter.Builder()
            .setServiceUuid(TOG_PARCEL_UUID)
            .build()

        return try {
            scanner?.startScan(listOf(filter), scanSettings, scanCallback)
            isScanning = true
            true
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied for BLE scan", e)
            false
        }
    }

    fun stopHardwareScan() {
        if (!isScanning || scanner == null) return
        try {
            scanner?.stopScan(scanCallback)
            isScanning = false
        } catch (_: SecurityException) {}
    }

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
            super.onStartSuccess(settingsInEffect)
            Log.d(TAG, "BLE advertising burst started successfully")
        }

        override fun onStartFailure(errorCode: Int) {
            super.onStartFailure(errorCode)
            isAdvertising = false
            Log.e(TAG, "BLE advertising burst failed with code: $errorCode")
        }
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            super.onScanResult(callbackType, result)
            val record = result?.scanRecord ?: return
            val serviceData = record.getServiceData(TOG_PARCEL_UUID) ?: record.bytes ?: return
            val rssi = result.rssi

            // Dispatch raw byte stream up to TypeScript Layer
            packetListener?.invoke(serviceData, rssi)
        }
    }
}
