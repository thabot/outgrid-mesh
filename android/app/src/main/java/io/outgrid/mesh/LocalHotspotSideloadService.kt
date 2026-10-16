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
    private var httpServerSocket: java.net.ServerSocket? = null
    private var isHttpServerRunning: Boolean = false

    fun startSideloadHotspot(onSuccess: (ssid: String) -> Unit, onError: (errorCode: Int) -> Unit) {
        startEmbeddedApkHttpServer()
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

    private fun startEmbeddedApkHttpServer() {
        if (isHttpServerRunning) return
        isHttpServerRunning = true
        Thread {
            try {
                val server = java.net.ServerSocket(8080)
                httpServerSocket = server
                while (isHttpServerRunning && !server.isClosed) {
                    val client = try { server.accept() } catch (_: Exception) { break }
                    Thread {
                        try {
                            client.use { sock ->
                                val apkFile = getLocalApkFile()
                                val out = sock.getOutputStream()
                                if (apkFile != null && apkFile.exists()) {
                                    val header = "HTTP/1.1 200 OK\r\n" +
                                        "Content-Type: application/vnd.android.package-archive\r\n" +
                                        "Content-Disposition: attachment; filename=\"OutGrid-Rescue.apk\"\r\n" +
                                        "Content-Length: ${apkFile.length()}\r\n" +
                                        "Connection: close\r\n\r\n"
                                    out.write(header.toByteArray(Charsets.UTF_8))
                                    apkFile.inputStream().use { input -> input.copyTo(out) }
                                    out.flush()
                                } else {
                                    val notFound = "HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\nAPK Not Found"
                                    out.write(notFound.toByteArray(Charsets.UTF_8))
                                    out.flush()
                                }
                            }
                        } catch (_: Exception) {}
                    }.start()
                }
            } catch (_: Exception) {
                isHttpServerRunning = false
            }
        }.start()
    }

    fun stopSideloadHotspot() {
        isHttpServerRunning = false
        try {
            httpServerSocket?.close()
        } catch (_: Exception) {}
        httpServerSocket = null
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reservation?.close()
            reservation = null
        }
    }

    fun getLocalApkFile(): File? {
        return try {
            val sourceFile = File(context.packageCodePath)
            if (!sourceFile.exists()) return null
            val cachedApk = File(context.cacheDir, "OutGrid-Rescue.apk")
            if (!cachedApk.exists() || cachedApk.length() != sourceFile.length()) {
                sourceFile.copyTo(cachedApk, overwrite = true)
            }
            cachedApk
        } catch (_: Exception) {
            val fallback = File(context.packageCodePath)
            if (fallback.exists()) fallback else null
        }
    }
}
