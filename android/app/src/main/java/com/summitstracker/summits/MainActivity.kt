package com.summitstracker.summits

import android.Manifest
import android.app.ActivityManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Debug
import android.util.Log
import android.view.ViewGroup
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.getcapacitor.BridgeActivity
import com.google.firebase.FirebaseApp

class MainActivity : BridgeActivity() {
    companion object {
        private const val NOTIFICATION_PERMISSION_REQUEST_CODE = 1001
        private const val TAG = "SummitsMain"
        private const val MAX_RENDERER_CRASH_RETRIES = 3
        private const val CRASH_WINDOW_MS = 15_000L
    }

    private var pullToRefreshLayout: SwipeRefreshLayout? = null
    private var isPullToRefreshEnabled = false
    private var rendererCrashCount = 0
    private var lastRendererCrashTime = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        // Initialize Firebase BEFORE calling super.onCreate()
        // This ensures Firebase is ready before Capacitor plugins initialize
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseApp.initializeApp(this)
                Log.d(TAG, "Firebase initialized successfully")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Firebase initialization failed: ${e.message}", e)
        }
        
        // Create notification channel for Android 8.0+
        createNotificationChannel()
        
        // Register custom plugins manually (in case auto-discovery fails)
        // This ensures RouteAnimationNative plugin is available
        registerPlugin(RouteAnimationNativePlugin::class.java)
        registerPlugin(NativePullToRefreshPlugin::class.java)
        
        super.onCreate(savedInstanceState)

        // Handle WebView render process crashes gracefully
        // Prevents the app from crashing when the WebView renderer is killed (e.g., OOM)
        bridge?.addWebViewListener(object : com.getcapacitor.WebViewListener() {
            override fun onRenderProcessGone(view: android.webkit.WebView?, detail: android.webkit.RenderProcessGoneDetail?): Boolean {
                val now = System.currentTimeMillis()
                val didCrash = detail?.didCrash() ?: false
                val wasKilled = !didCrash

                // Reset counter if outside the crash window
                if (now - lastRendererCrashTime > CRASH_WINDOW_MS) {
                    rendererCrashCount = 0
                }
                rendererCrashCount++
                lastRendererCrashTime = now

                Log.e(TAG, "===== WebView RENDERER PROCESS GONE #$rendererCrashCount =====")
                Log.e(TAG, "  didCrash=$didCrash, wasKilled(OOM)=$wasKilled")
                Log.e(TAG, "  Consecutive crashes in last ${CRASH_WINDOW_MS / 1000}s: $rendererCrashCount / $MAX_RENDERER_CRASH_RETRIES")

                // Log memory state
                logMemoryState()

                if (rendererCrashCount >= MAX_RENDERER_CRASH_RETRIES) {
                    Log.e(TAG, "CRASH LOOP DETECTED: $rendererCrashCount consecutive renderer crashes.")
                    Log.e(TAG, "Stopping automatic reload to prevent app process death.")
                    Log.e(TAG, "The user must close and reopen the app, or reduce memory usage.")
                    // Don't reload — break the crash loop so the app process survives
                    return true
                }

                val delayMs = rendererCrashCount * 1000L
                Log.w(TAG, "Reloading WebView in ${delayMs}ms (attempt $rendererCrashCount)...")
                view?.postDelayed({
                    Log.i(TAG, "Performing WebView reload now")
                    logMemoryState()
                    try {
                        view.loadUrl("about:blank")
                        view.loadUrl(bridge?.localUrl?.toString() ?: "about:blank")
                        Log.i(TAG, "WebView reload initiated successfully")
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to reload WebView: ${e.message}", e)
                    }
                }, delayMs)

                return true // handled — prevents app crash
            }
        })

        setupNativePullToRefresh()
    }

    /**
     * Create notification channel for Android 8.0+ (API 26+)
     * Required for push notifications to display properly
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                getString(R.string.default_notification_channel_id),
                "Summits Notifications",
                NotificationManager.IMPORTANCE_HIGH
            )
            channel.description = "Activity and follow notifications from Summits"
            channel.enableVibration(true)
            channel.vibrationPattern = longArrayOf(200, 100, 200)
            
            val manager = getSystemService(NotificationManager::class.java)
            manager?.let {
                it.createNotificationChannel(channel)
                Log.d(TAG, "Notification channel created successfully")
            }
        }
    }

    /**
     * Request notification permission for Android 13+ (API 33+)
     * This is called by the Capacitor PushNotifications plugin when needed
     */
    fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                // Request the permission
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    NOTIFICATION_PERMISSION_REQUEST_CODE
                )
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == NOTIFICATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "Notification permission granted")
            } else {
                Log.d(TAG, "Notification permission denied")
            }
        }
    }

    private fun logMemoryState() {
        val runtime = Runtime.getRuntime()
        val usedMB = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024)
        val maxMB = runtime.maxMemory() / (1024 * 1024)
        val freeMB = runtime.freeMemory() / (1024 * 1024)
        Log.e(TAG, "  JVM Memory: ${usedMB}MB used / ${maxMB}MB max, ${freeMB}MB free")

        val am = getSystemService(ACTIVITY_SERVICE) as? ActivityManager
        am?.let {
            val memInfo = ActivityManager.MemoryInfo()
            it.getMemoryInfo(memInfo)
            val availMB = memInfo.availMem / (1024 * 1024)
            val totalMB = memInfo.totalMem / (1024 * 1024)
            val thresholdMB = memInfo.threshold / (1024 * 1024)
            Log.e(TAG, "  System Memory: ${availMB}MB available / ${totalMB}MB total, lowMemory=${memInfo.lowMemory}, threshold=${thresholdMB}MB")
        }

        val debug = Debug.getNativeHeapAllocatedSize() / (1024 * 1024)
        Log.e(TAG, "  Native heap allocated: ${debug}MB")
    }

    fun setNativePullToRefreshEnabled(enabled: Boolean) {
        runOnUiThread {
            isPullToRefreshEnabled = enabled
            pullToRefreshLayout?.isEnabled = enabled
            if (!enabled) {
                pullToRefreshLayout?.isRefreshing = false
            }
        }
    }

    fun completeNativePullToRefresh() {
        runOnUiThread {
            pullToRefreshLayout?.isRefreshing = false
        }
    }

    private fun setupNativePullToRefresh() {
        val webView = bridge?.webView ?: return
        val currentParent = webView.parent as? ViewGroup ?: return

        if (currentParent is SwipeRefreshLayout) {
            pullToRefreshLayout = currentParent
            currentParent.isEnabled = false
            return
        }

        val parentLayoutParams = webView.layoutParams
        val childIndex = currentParent.indexOfChild(webView)

        currentParent.removeView(webView)

        val refreshLayout = SwipeRefreshLayout(this).apply {
            layoutParams = parentLayoutParams
            isEnabled = false
            setOnChildScrollUpCallback { _, child ->
                child?.canScrollVertically(-1) ?: false
            }
            setOnRefreshListener {
                if (!isPullToRefreshEnabled) {
                    isRefreshing = false
                    return@setOnRefreshListener
                }
                bridge?.triggerWindowJSEvent("native-pull-to-refresh")
            }
        }

        refreshLayout.addView(
            webView,
            ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        currentParent.addView(refreshLayout, childIndex)
        pullToRefreshLayout = refreshLayout
    }
}



