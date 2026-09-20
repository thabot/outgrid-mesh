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

/**
 * Main Entry Activity for OutGrid Rescue
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize WebView for OutGrid Rescue UI
        webView = findViewById(R.id.webView)
        configureWebView()

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

    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
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

        // WebChromeClient to capture JS console messages to Logcat for debugging
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
        }

        // Load entry index page via synthetic secure origin
        webView.loadUrl("https://appassets.androidplatform.net/")
    }

    override fun onDestroy() {
        super.onDestroy()
        webView.destroy()
    }
}
