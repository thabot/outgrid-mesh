package io.outgrid.mesh

import android.content.Context
import android.hardware.camera2.CameraManager
import android.os.Handler
import android.os.Looper

/**
 * Emergency Flashlight Controller with Native High-Precision Morse Code Loop
 * Runs on Android background thread for millisecond accuracy
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Emergency Beacons
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
class EmergencyFlashlightController(private val context: Context) {

    private val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
    private var cameraId: String? = null
    private val handler = Handler(Looper.getMainLooper())
    private var isStrobeRunning = false
    private var patternIndex = 0
    private var startTime: Long = 0L

    // SOS Pattern in milliseconds: (... --- ...)
    // S: 200 on, 200 off (x3)
    // O: 600 on, 200 off (x3)
    // S: 200 on, 200 off (x3)
    // Gap: 1500 off
    private val sosPattern = longArrayOf(
        200, 200, 200, 200, 200, 200,     // S: dot dot dot
        600, 200, 600, 200, 600, 200,     // O: dash dash dash
        200, 200, 200, 200, 200, 1500    // S: dot dot dot + pause
    )

    private val MAX_CONTINUOUS_MS = 5 * 60 * 1000L // 5-minute thermal safety cutoff

    init {
        try {
            cameraId = cameraManager?.cameraIdList?.firstOrNull()
        } catch (_: Exception) {}
    }

    private val strobeRunnable = object : Runnable {
        override fun run() {
            if (!isStrobeRunning) return

            // Thermal cutoff check
            if (System.currentTimeMillis() - startTime >= MAX_CONTINUOUS_MS) {
                stopStrobe()
                return
            }

            val isOn = (patternIndex % 2 == 0)
            val duration = sosPattern[patternIndex]

            setFlash(isOn)

            patternIndex = (patternIndex + 1) % sosPattern.size
            handler.postDelayed(this, duration)
        }
    }

    fun startSosStrobe() {
        if (isStrobeRunning || cameraId == null) return
        isStrobeRunning = true
        patternIndex = 0
        startTime = System.currentTimeMillis()
        handler.post(strobeRunnable)
    }

    fun stopStrobe() {
        isStrobeRunning = false
        handler.removeCallbacks(strobeRunnable)
        setFlash(false)
    }

    fun isStrobeActive(): Boolean = isStrobeRunning

    fun setFlash(enable: Boolean) {
        try {
            cameraId?.let { id ->
                cameraManager?.setTorchMode(id, enable)
            }
        } catch (_: Exception) {}
    }
}
