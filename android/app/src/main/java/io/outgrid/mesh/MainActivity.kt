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

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = false
        settings.allowContentAccess = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        // ── Fix: prevent white flash — set dark background immediately ──
        webView.setBackgroundColor(Color.parseColor("#090d16"))

        // ── Fix: enable ES module support required by SvelteKit ──
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            WebView.setWebContentsDebuggingEnabled(false)
        }

        // Direct Local Asset Interceptor
        // Handles root-relative imports (/_app/...) and vendor assets (/_vendor/...)
        webView.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url ?: return null
                if (url.host == "appassets.androidplatform.net") {
                    var path = url.path ?: ""
                    if (path.isEmpty() || path == "/") {
                        path = "/index.html"
                    }
                    val assetPath = path.removePrefix("/")
                    try {
                        val stream = assets.open(assetPath)
                        val mimeType = guessMimeType(assetPath)
                        val headers = mapOf(
                            "Access-Control-Allow-Origin" to "*",
                            "Cache-Control" to "no-cache"
                        )
                        return WebResourceResponse(mimeType, "UTF-8", 200, "OK", headers, stream)
                    } catch (e: Exception) {
                        android.util.Log.e("OutGridWebView", "Local asset not found: $assetPath", e)
                    }
                }
                return super.shouldInterceptRequest(view, request)
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: androidx.webkit.WebResourceErrorCompat?
            ) {
                error?.let {
                    android.util.Log.e("OutGridWebView", "WebView error: ${it.description} for ${request?.url}")
                }
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

        // Load entry index page from local assets via appassets virtual host
        webView.loadUrl("https://appassets.androidplatform.net/index.html")
    }

    private fun guessMimeType(path: String): String = when {
        path.endsWith(".html") -> "text/html; charset=utf-8"
        path.endsWith(".js") || path.endsWith(".mjs") -> "text/javascript"
        path.endsWith(".css") -> "text/css"
        path.endsWith(".json") -> "application/json"
        path.endsWith(".svg") -> "image/svg+xml"
        path.endsWith(".png") -> "image/png"
        path.endsWith(".jpg") || path.endsWith(".jpeg") -> "image/jpeg"
        path.endsWith(".webp") -> "image/webp"
        path.endsWith(".wasm") -> "application/wasm"
        path.endsWith(".pbf") -> "application/x-protobuf"
        path.endsWith(".woff2") -> "font/woff2"
        path.endsWith(".woff") -> "font/woff"
        path.endsWith(".ttf") -> "font/ttf"
        else -> "application/octet-stream"
    }

    override fun onDestroy() {
        super.onDestroy()
        webView.destroy()
    }
}
