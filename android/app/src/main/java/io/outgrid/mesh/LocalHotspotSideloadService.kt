package io.outgrid.mesh

import android.content.Context
import android.net.wifi.WifiManager
import android.os.Build
import java.io.File

/**
 * Local Hotspot & Offline APK Sideload Service
 * Serves outgrid-rescue.apk to disaster victims connecting to Wi-Fi SoftAP
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Offline Sideload
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
class LocalHotspotSideloadService(private val context: Context) {

    private var reservation: WifiManager.LocalOnlyHotspotReservation? = null

    fun startSideloadHotspot(onSuccess: (ssid: String) -> Unit, onError: (errorCode: Int) -> Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager

            try {
                wifiManager.startLocalOnlyHotspot(object : WifiManager.LocalOnlyHotspotCallback() {
                    override fun onStarted(res: WifiManager.LocalOnlyHotspotReservation?) {
                        super.onStarted(res)
                        reservation = res
                        val ssid = res?.wifiConfiguration?.SSID ?: "OutGrid-Rescue-Download"
                        onSuccess(ssid)
                    }

                    override fun onStopped() {
                        super.onStopped()
                        reservation = null
                    }

                    override fun onFailed(reason: Int) {
                        super.onFailed(reason)
                        onError(reason)
                    }
                }, null)
            } catch (_: SecurityException) {
                onError(-1)
            }
        }
    }

    fun stopSideloadHotspot() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reservation?.close()
            reservation = null
        }
    }

    fun getLocalApkFile(): File? {
        // App package file located at context.packageCodePath
        val apkPath = context.packageCodePath
        val file = File(apkPath)
        return if (file.exists()) file else null
    }
}
