package io.outgrid.mesh

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

/**
 * Main Entry Activity for OutGrid Rescue
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var androidBridge: OutGridAndroidBridge? = null

    // Batch Runtime Permissions Request Launcher (Sprint D Task D.3)
    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val grantedCount = permissions.values.count { it }
        android.util.Log.i("OutGridMesh", "Runtime permissions granted: $grantedCount / ${permissions.size}")
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Request all required hardware and notification permissions
        requestRuntimePermissions()

        // Initialize WebView for OutGrid Rescue UI
        webView = findViewById(R.id.webView)
        configureWebView()

        // Wire BLE Radio incoming packets directly into JavaScript bridge
        BleRadioNativeDriver.setPacketListener { bytes, rssi ->
            androidBridge?.dispatchIncomingPacket(bytes, rssi)
        }

        // Handle hardware Back button to navigate back in WebView history
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        // Start 24/7 OutGrid Mesh Foreground Radio Service
        val serviceIntent = Intent(this, OutGridMeshService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }

    private fun requestRuntimePermissions() {
        val permissionsToRequest = mutableListOf<String>()

        // 1. Precise GPS Location (Emergency SOS <1m accuracy)
        permissionsToRequest.add(Manifest.permission.ACCESS_FINE_LOCATION)
        permissionsToRequest.add(Manifest.permission.ACCESS_COARSE_LOCATION)

        // 2. Camera & Audio (SOS Flashlight, QR Scan, Voice Clips)
        permissionsToRequest.add(Manifest.permission.CAMERA)
        permissionsToRequest.add(Manifest.permission.RECORD_AUDIO)

        // 3. Bluetooth Mesh Permissions (Android 12+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissionsToRequest.add(Manifest.permission.BLUETOOTH_SCAN)
            permissionsToRequest.add(Manifest.permission.BLUETOOTH_ADVERTISE)
            permissionsToRequest.add(Manifest.permission.BLUETOOTH_CONNECT)
        }

        // 4. Nearby Wi-Fi Devices (Android 13+ for Offline APK Hotspot)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionsToRequest.add(Manifest.permission.NEARBY_WIFI_DEVICES)
            permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val ungranted = permissionsToRequest.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (ungranted.isNotEmpty()) {
            permissionLauncher.launch(ungranted.toTypedArray())
        }
    }

    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        
        // Expose Native Android Bridge to window.AndroidBridge
        androidBridge = OutGridAndroidBridge(this, webView)
        webView.addJavascriptInterface(androidBridge!!, "AndroidBridge")
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        webView.setBackgroundColor(Color.parseColor("#090d16"))

        // Enable Chrome DevTools remote debugging
        WebView.setWebContentsDebuggingEnabled(true)

        // Standard AndroidX AssetLoader handles secure https:// origin for ES Modules & WebCrypto
        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url ?: return null
                val path = url.path ?: "/"

                // Handle root domain request and serve offline index.html entry
                if (url.host == "appassets.androidplatform.net" && (path == "/" || path.isEmpty())) {
                    return try {
                        val inputStream = assets.open("index.html")
                        val response = WebResourceResponse("text/html", "UTF-8", inputStream)
                        val headers = mutableMapOf(
                            "Access-Control-Allow-Origin" to "*",
                            "Cache-Control" to "no-cache"
                        )
                        response.responseHeaders = headers
                        response
                    } catch (e: Exception) {
                        null
                    }
                }

                // Delegate asset loading to AndroidX WebViewAssetLoader
                var response = assetLoader.shouldInterceptRequest(url)

                // Direct AssetManager fallback if AssetLoader did not resolve the asset
                if (response == null && url.host == "appassets.androidplatform.net") {
                    val cleanPath = path.removePrefix("/")
                    response = try {
                        val inputStream = assets.open(cleanPath)
                        WebResourceResponse(null, null, inputStream)
                    } catch (e: Exception) {
                        null
                    }
                }

                // Client SPA fallback: if not found and route does not have file extension, serve index.html
                if (response == null && url.host == "appassets.androidplatform.net" && !path.substringAfterLast("/").contains(".")) {
                    return try {
                        val inputStream = assets.open("index.html")
                        val fallbackResponse = WebResourceResponse("text/html", "UTF-8", inputStream)
                        fallbackResponse.responseHeaders = mutableMapOf("Access-Control-Allow-Origin" to "*")
                        fallbackResponse
                    } catch (e: Exception) {
                        null
                    }
                }

                if (response == null) return null

                // Enforce JavaScript and web asset MIME types for modern Chromium ES Module dynamic loading
                val effectiveMime = when {
                    path.endsWith(".js") -> "text/javascript"
                    path.endsWith(".css") -> "text/css"
                    path.endsWith(".json") -> "application/json"
                    path.endsWith(".svg") -> "image/svg+xml"
                    path.endsWith(".png") -> "image/png"
                    path.endsWith(".html") -> "text/html"
                    path.endsWith(".wasm") -> "application/wasm"
                    else -> response.mimeType
                }
                response.mimeType = effectiveMime

                val headers = response.responseHeaders?.toMutableMap() ?: mutableMapOf()
                headers["Access-Control-Allow-Origin"] = "*"
                response.responseHeaders = headers

                return response
            }
        }

        // WebChromeClient to capture JS console, handle Geolocation & Media permissions (Sprint D Task D.3)
        webView.webChromeClient = object : android.webkit.WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                consoleMessage?.let {
                    android.util.Log.d(
                        "OutGridJS",
                        "[${it.messageLevel()}] ${it.message()} -- From line ${it.lineNumber()} of ${it.sourceId()}"
                    )
                }
                return true
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: android.webkit.GeolocationPermissions.Callback?
            ) {
                // Grant geolocation for app assets origin
                callback?.invoke(origin, true, false)
            }

            override fun onPermissionRequest(request: android.webkit.PermissionRequest?) {
                // Grant camera / microphone WebRTC access for QR scanning & emergency voice clips
                request?.grant(request.resources)
            }
        }

        // Load entry index page via synthetic secure origin
        webView.loadUrl("https://appassets.androidplatform.net/")
    }

    override fun onDestroy() {
        super.onDestroy()
        webView.destroy()
    }
}
