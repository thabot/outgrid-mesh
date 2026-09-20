package io.outgrid.mesh

import android.app.AlarmManager
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
import android.os.SystemClock
import androidx.core.app.NotificationCompat

/**
 * 24/7 OutGrid Emergency Mesh Foreground Service
 * Maintains continuous background BLE scanning, duty cycling, AlarmManager idle-wakeups, and WakeLock
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Native Runtime & Sprint H Task H.3
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
class OutGridMeshService : Service() {

    private var wakeLock: PowerManager.WakeLock? = null
    private val channelId = "outgrid_emergency_mesh_channel"
    private val notificationId = 1199
    private var alarmManager: AlarmManager? = null
    private var periodicWakeIntent: PendingIntent? = null
    private val SCAN_DUTY_INTERVAL_MS = 60000L // 60s periodic scan cycle

    override fun onCreate() {
        super.onCreate()
        instance = this
        alarmManager = getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        createNotificationChannel()
        acquireWakeLock()
        schedulePeriodicDozeWakeup()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = buildOngoingNotification()
        startForeground(notificationId, notification)

        // Initialize BLE Radio Engine
        BleRadioNativeDriver.initialize(applicationContext)
        BleRadioNativeDriver.startScanning()

        schedulePeriodicDozeWakeup()
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        cancelPeriodicDozeWakeup()
        BleRadioNativeDriver.stopScanning()
        releaseWakeLock()
    }

    private fun schedulePeriodicDozeWakeup() {
        try {
            val intent = Intent(this, OutGridMeshService::class.java).apply {
                action = "ACTION_PERIODIC_SCAN_WAKEUP"
            }
            periodicWakeIntent = PendingIntent.getService(
                this,
                9921,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val triggerAt = SystemClock.elapsedRealtime() + SCAN_DUTY_INTERVAL_MS
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager?.setExactAndAllowWhileIdle(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    triggerAt,
                    periodicWakeIntent!!
                )
            } else {
                alarmManager?.setExact(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    triggerAt,
                    periodicWakeIntent!!
                )
            }
        } catch (_: Exception) {}
    }

    private fun cancelPeriodicDozeWakeup() {
        periodicWakeIntent?.let {
            alarmManager?.cancel(it)
        }
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

    private fun buildOngoingNotification(peerCount: Int = 0): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val statusText = if (peerCount > 0) {
            "🛡️ OutGrid Mesh Active • เฝ้าระวังคลื่นวิทยุกู้ภัย (เชื่อมต่อ $peerCount โหนด)"
        } else {
            "🛡️ OutGrid Mesh Active • เฝ้าระวังคลื่นวิทยุกู้ภัย 24 ชม."
        }

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("🚨 OutGrid Rescue Grid")
            .setContentText(statusText)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    fun updatePeerCount(count: Int) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        notificationManager?.notify(notificationId, buildOngoingNotification(count))
    }

    companion object {
        var instance: OutGridMeshService? = null
            private set
    }
}
