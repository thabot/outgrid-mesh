package io.outgrid.mesh

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

/**
 * 24/7 OutGrid Emergency Mesh Foreground Service
 * Maintains continuous background BLE scanning, duty cycling, and WakeLock
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Native Runtime
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
class OutGridMeshService : Service() {

    private var wakeLock: PowerManager.WakeLock? = null
    private val channelId = "outgrid_emergency_mesh_channel"
    private val notificationId = 1199

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        acquireWakeLock()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = buildOngoingNotification()
        startForeground(notificationId, notification)

        // Initialize BLE Radio Engine
        BleRadioNativeDriver.initialize(applicationContext)
        BleRadioNativeDriver.startScanning()

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        BleRadioNativeDriver.stopScanning()
        releaseWakeLock()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun acquireWakeLock() {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "OutGridMesh:RadioDutyWakeLock"
        ).apply {
            acquire(10 * 60 * 1000L) // 10 minutes temporary window
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) it.release()
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "OutGrid Emergency Mesh Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "รักษาการเชื่อมต่อวงข่ายวิทยุกู้ภัยออฟไลน์ตลอด 24 ชม."
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildOngoingNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("🚨 OutGrid Mesh ทำงานอยู่เบื้องหลัง")
            .setContentText("เชื่อมต่อวงข่ายวิทยุกู้ภัยออฟไลน์ 24 ชม.")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
