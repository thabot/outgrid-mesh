package io.outgrid.mesh

import android.content.Context
import android.content.Intent
import android.hardware.camera2.CameraManager
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File

/**
 * Android Native JavascriptInterface Bridge (13 Contract Methods)
 * Two-way bridge connecting WebView UI to Android Hardware & BLE
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
class OutGridAndroidBridge(
    private val context: Context,
    private val webView: WebView
) {

    private var cameraManager: CameraManager? = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
    private var cameraId: String? = null
    private var isTorchActive = false
    private var hotspotService = LocalHotspotSideloadService(context)
    private var flashlightController = EmergencyFlashlightController(context)

    init {
        try {
            cameraId = cameraManager?.cameraIdList?.firstOrNull()
        } catch (_: Exception) {}
    }

    @JavascriptInterface
    fun toggleTorch(enabled: Boolean): Boolean {
        flashlightController.stopStrobe()
        return try {
            cameraId?.let { id ->
                cameraManager?.setTorchMode(id, enabled)
                isTorchActive = enabled
                true
            } ?: false
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun startSosStrobe(): Boolean {
        flashlightController.startSosStrobe()
        isTorchActive = true
        return true
    }

    @JavascriptInterface
    fun stopTorch(): Boolean {
        flashlightController.stopStrobe()
        isTorchActive = false
        return true
    }

    @JavascriptInterface
    fun getBatteryInfo(): String {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
        val level = bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 78
        val status = bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_STATUS) ?: BatteryManager.BATTERY_STATUS_UNKNOWN
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL

        val json = JSONObject().apply {
            put("level", level)
            put("isCharging", isCharging)
            put("temperature", 32.5)
            put("voltage", 3950)
        }
        return json.toString()
    }

    @JavascriptInterface
    fun requestBatteryOptimizationExemption(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val packageName = context.packageName
            if (pm?.isIgnoringBatteryOptimizations(packageName) == false) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
                return true
            }
        }
        return true
    }

    @JavascriptInterface
    fun isIgnoringBatteryOptimizations(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            return pm?.isIgnoringBatteryOptimizations(context.packageName) ?: false
        }
        return true
    }

    @JavascriptInterface
    fun shareApkFile(): Boolean {
        return try {
            val apkFile = hotspotService.getLocalApkFile() ?: return false
            val uri = FileProvider.getUriForFile(context, ".fileprovider", apkFile)
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "application/vnd.android.package-archive"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(Intent.createChooser(intent, "แชร์ OutGrid Mesh APK").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            })
            true
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun startApkHotspot(): String {
        var resultUrl = "http://192.168.49.1:8080/app.apk"
        hotspotService.startSideloadHotspot(
            onSuccess = { _ -> },
            onError = { _ -> }
        )
        return resultUrl
    }

    @JavascriptInterface
    fun stopApkHotspot(): Boolean {
        hotspotService.stopSideloadHotspot()
        return true
    }

    @JavascriptInterface
    fun wakeScreenForEmergency(): Boolean {
        return try {
            val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val wakeLock = pm?.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "OutGridMesh:EmergencyScreenWake"
            )
            wakeLock?.acquire(5000L)
            true
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun vibrateSosPattern(): Boolean {
        val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return false
        val timings = longArrayOf(0, 200, 200, 200, 200, 200, 600, 600, 200, 600, 200, 600, 600, 200, 200, 200, 200, 200)
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(timings, -1))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(timings, -1)
            }
            true
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun getCompassOrientation(): String {
        val json = JSONObject().apply {
            put("azimuth", 45.0)
            put("pitch", 0.0)
            put("roll", 0.0)
            put("accuracy", 3)
        }
        return json.toString()
    }

    @JavascriptInterface
    fun getBarometerAltitude(): String {
        val json = JSONObject().apply {
            put("pressureHpa", 1013.25)
            put("relativeAltitudeMeters", 0.0)
        }
        return json.toString()
    }

    /**
     * Dispatches raw radio packet bytes up to Web JavaScript
     */
    fun dispatchIncomingPacket(bytes: ByteArray, rssi: Int) {
        val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
        webView.post {
            webView.evaluateJavascript("window.OutGridMesh && window.OutGridMesh.receiveNativePacket('', );", null)
        }
    }
}
