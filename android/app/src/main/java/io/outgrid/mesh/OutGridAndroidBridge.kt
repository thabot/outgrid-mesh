package io.outgrid.mesh

import android.content.Context
import android.content.Intent
import android.hardware.camera2.CameraManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
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
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import androidx.core.app.NotificationCompat
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
    private val blePlugin: OutGridBlePlugin by lazy { OutGridBlePlugin(context) }

    init {
        try {
            cameraManager?.let { cm ->
                for (id in cm.cameraIdList) {
                    try {
                        val chars = cm.getCameraCharacteristics(id)
                        val flashAvailable = chars.get(android.hardware.camera2.CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
                        if (flashAvailable) {
                            cameraId = id
                            break
                        }
                    } catch (_: Exception) {}
                }
                if (cameraId == null) {
                    cameraId = cm.cameraIdList.firstOrNull()
                }
            }
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
    fun stopSosStrobe(): Boolean {
        flashlightController.stopStrobe()
        try {
            cameraId?.let { cameraManager?.setTorchMode(it, false) }
        } catch (_: Exception) {}
        try {
            cameraManager?.cameraIdList?.forEach { id ->
                try { cameraManager?.setTorchMode(id, false) } catch (_: Exception) {}
            }
        } catch (_: Exception) {}
        isTorchActive = false
        return true
    }

    @JavascriptInterface
    fun stopTorch(): Boolean {
        flashlightController.stopStrobe()
        try {
            cameraId?.let { cameraManager?.setTorchMode(it, false) }
        } catch (_: Exception) {}
        try {
            cameraManager?.cameraIdList?.forEach { id ->
                try { cameraManager?.setTorchMode(id, false) } catch (_: Exception) {}
            }
        } catch (_: Exception) {}
        isTorchActive = false
        return true
    }

    private var toneGenerator: android.media.ToneGenerator? = null
    private var alarmThread: Thread? = null
    private var isAlarmRunning = false

    @JavascriptInterface
    fun playAudibleAlarm(): Boolean {
        if (isAlarmRunning) return true
        isAlarmRunning = true
        alarmThread = Thread {
            try {
                val tg = android.media.ToneGenerator(
                    android.media.AudioManager.STREAM_ALARM,
                    100
                )
                toneGenerator = tg
                while (isAlarmRunning) {
                    tg.startTone(android.media.ToneGenerator.TONE_CDMA_EMERGENCY_RINGBACK, 350)
                    Thread.sleep(400)
                }
                tg.release()
            } catch (_: Exception) {}
        }.apply { start() }
        return true
    }

    @JavascriptInterface
    fun stopAudibleAlarm(): Boolean {
        isAlarmRunning = false
        try {
            toneGenerator?.stopTone()
            toneGenerator?.release()
        } catch (_: Exception) {}
        toneGenerator = null
        alarmThread?.interrupt()
        alarmThread = null
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
                return try {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$packageName")
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(intent)
                    true
                } catch (_: Exception) {
                    try {
                        val fallbackIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        context.startActivity(fallbackIntent)
                        true
                    } catch (_: Exception) {
                        false
                    }
                }
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
            val authority = "${context.packageName}.fileprovider"
            val uri = FileProvider.getUriForFile(context, authority, apkFile)
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
        val resultUrl = "http://192.168.49.1:8080/app.apk"
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

    private var lastAzimuth: Double = 45.0
    private var lastPitch: Double = 0.0
    private var lastRoll: Double = 0.0
    private var lastPressureHpa: Double = 1013.25
    private var sensorsRegistered: Boolean = false
    private var sensorManager: android.hardware.SensorManager? = null
    private var sensorListener: android.hardware.SensorEventListener? = null
    private val sensorHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private val SENSOR_AUTO_UNREGISTER_DELAY_MS = 10000L // Auto-release sensors after 10s of inactivity

    private val unregisterSensorsRunnable = Runnable {
        stopSensors()
    }

    private fun ensureSensorsRegistered() {
        sensorHandler.removeCallbacks(unregisterSensorsRunnable)
        sensorHandler.postDelayed(unregisterSensorsRunnable, SENSOR_AUTO_UNREGISTER_DELAY_MS)
        if (sensorsRegistered) return
        sensorsRegistered = true
        try {
            val sm = context.getSystemService(Context.SENSOR_SERVICE) as? android.hardware.SensorManager ?: return
            sensorManager = sm
            @Suppress("DEPRECATION")
            val orientSensor = sm.getDefaultSensor(android.hardware.Sensor.TYPE_ORIENTATION)
            val pressureSensor = sm.getDefaultSensor(android.hardware.Sensor.TYPE_PRESSURE)
            val listener = object : android.hardware.SensorEventListener {
                override fun onSensorChanged(event: android.hardware.SensorEvent?) {
                    if (event == null) return
                    @Suppress("DEPRECATION")
                    if (event.sensor.type == android.hardware.Sensor.TYPE_ORIENTATION && event.values.size >= 3) {
                        lastAzimuth = ((event.values[0].toDouble() % 360.0) + 360.0) % 360.0
                        lastPitch = event.values[1].toDouble()
                        lastRoll = event.values[2].toDouble()
                    } else if (event.sensor.type == android.hardware.Sensor.TYPE_PRESSURE && event.values.isNotEmpty()) {
                        lastPressureHpa = event.values[0].toDouble()
                    }
                }
                override fun onAccuracyChanged(sensor: android.hardware.Sensor?, accuracy: Int) {}
            }
            sensorListener = listener
            if (orientSensor != null) {
                sm.registerListener(listener, orientSensor, android.hardware.SensorManager.SENSOR_DELAY_UI)
            }
            if (pressureSensor != null) {
                sm.registerListener(listener, pressureSensor, android.hardware.SensorManager.SENSOR_DELAY_UI)
            }
        } catch (_: Exception) {}
    }

    @JavascriptInterface
    fun stopSensors(): Boolean {
        sensorHandler.removeCallbacks(unregisterSensorsRunnable)
        if (!sensorsRegistered) return true
        sensorsRegistered = false
        return try {
            sensorListener?.let { sensorManager?.unregisterListener(it) }
            sensorListener = null
            true
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun getCompassOrientation(): String {
        ensureSensorsRegistered()
        val json = JSONObject().apply {
            put("azimuth", lastAzimuth)
            put("pitch", lastPitch)
            put("roll", lastRoll)
            put("accuracy", 3)
        }
        return json.toString()
    }

    @JavascriptInterface
    fun getBarometerAltitude(): String {
        ensureSensorsRegistered()
        val relativeAlt = android.hardware.SensorManager.getAltitude(
            android.hardware.SensorManager.PRESSURE_STANDARD_ATMOSPHERE,
            lastPressureHpa.toFloat()
        ).toDouble()
        val json = JSONObject().apply {
            put("pressureHpa", lastPressureHpa)
            put("relativeAltitudeMeters", relativeAlt)
        }
        return json.toString()
    }

    /**
     * Accurately checks whether device has validated active Internet access
     */
    @JavascriptInterface
    fun isInternetConnected(): Boolean {
        return try {
            val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val network = cm.activeNetwork ?: return false
                val caps = cm.getNetworkCapabilities(network) ?: return false
                caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            } else {
                @Suppress("DEPRECATION")
                val netInfo = cm.activeNetworkInfo
                netInfo != null && netInfo.isConnected
            }
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Displays a system Heads-Up Notification for incoming direct or broadcast chat messages
     */
    @JavascriptInterface
    fun showMessageNotification(sender: String, message: String): Boolean {
        return try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return false
            val channelId = "outgrid_chat_notifications"
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    channelId,
                    "OutGrid ข้อความวิทยุฉุกเฉิน",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "การแจ้งเตือนข้อความฉุกเฉินและแชทวิทยุแบบออฟไลน์"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 200, 100, 200)
                }
                notificationManager.createNotificationChannel(channel)
            }

            val launchIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                launchIntent,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT else PendingIntent.FLAG_UPDATE_CURRENT
            )

            val notification = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(android.R.drawable.ic_dialog_email)
                .setContentTitle("💬 $sender")
                .setContentText(message)
                .setStyle(NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_SOUND or NotificationCompat.DEFAULT_VIBRATE)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build()

            notificationManager.notify((System.currentTimeMillis() % 10000).toInt(), notification)
            true
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Transmits a raw TOG v1.1 packet over Bluetooth LE hardware
     */
    @JavascriptInterface
    fun transmitRadioPacket(base64Payload: String, txPowerHigh: Boolean = true): Boolean {
        return try {
            val rawBytes = Base64.decode(base64Payload, Base64.NO_WRAP)
            // Transmission primes radio scan agility for incoming responses
            BleRadioNativeDriver.boostScanPerformance(60000L)
            blePlugin.transmitPacket(rawBytes, txPowerHigh)
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Sets runtime power profile (NORMAL, ECO, SURVIVAL) for radio duty cycling
     */
    @JavascriptInterface
    fun setPowerProfile(profile: String): Boolean {
        return try {
            BleRadioNativeDriver.setPowerProfile(profile)
            true
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Temporarily boosts BLE radio scanning performance during active conversation
     */
    @JavascriptInterface
    fun boostScanPerformance(durationMs: Long = 60000L): Boolean {
        return try {
            BleRadioNativeDriver.boostScanPerformance(durationMs)
            true
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Dispatches raw radio packet bytes up to Web JavaScript
     */
    fun dispatchIncomingPacket(bytes: ByteArray, rssi: Int) {
        val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
        webView.post {
            webView.evaluateJavascript("window.OutGridMesh && window.OutGridMesh.receiveNativePacket('$base64', $rssi);", null)
        }
    }
}

