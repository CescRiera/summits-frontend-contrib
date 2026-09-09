package com.summitstracker.summits

import android.graphics.BitmapFactory
import android.os.Bundle
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import android.view.Choreographer
import android.view.MotionEvent
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import com.mapbox.geojson.Feature
import com.mapbox.geojson.FeatureCollection
import com.mapbox.geojson.LineString
import com.mapbox.geojson.Point
import com.mapbox.maps.CameraOptions
import com.mapbox.maps.MapView
import com.mapbox.maps.Style
import com.mapbox.maps.extension.style.expressions.dsl.generated.eq
import com.mapbox.maps.extension.style.expressions.dsl.generated.geometryType
import com.mapbox.maps.extension.style.expressions.dsl.generated.get
import com.mapbox.maps.extension.style.expressions.dsl.generated.literal
import com.mapbox.maps.extension.style.expressions.generated.Expression
import com.mapbox.maps.extension.style.layers.addLayer
import com.google.gson.JsonObject
import com.mapbox.maps.extension.style.layers.generated.CircleLayer
import com.mapbox.maps.extension.style.layers.generated.LineLayer
import com.mapbox.maps.extension.style.layers.generated.SymbolLayer
import com.mapbox.maps.extension.style.layers.properties.generated.IconAnchor
import com.mapbox.maps.extension.style.layers.properties.generated.LineCap
import com.mapbox.maps.extension.style.layers.properties.generated.LineJoin
import com.mapbox.maps.extension.style.layers.properties.generated.TextAnchor
import com.mapbox.maps.extension.style.sources.addSource
import com.mapbox.maps.extension.style.sources.generated.GeoJsonSource
import com.mapbox.maps.extension.style.sources.generated.RasterDemSource
import com.mapbox.maps.extension.style.terrain.generated.setTerrain
import com.mapbox.maps.extension.style.terrain.generated.terrain
import com.mapbox.maps.plugin.animation.MapAnimationOptions.Companion.mapAnimationOptions
import com.mapbox.maps.plugin.animation.flyTo
import com.mapbox.maps.plugin.compass.compass
import com.mapbox.maps.plugin.scalebar.scalebar
import org.json.JSONArray
import java.io.File
import java.nio.charset.StandardCharsets
import java.util.Locale
import kotlin.math.*

/**
 * Performance-focused implementation for very large routes.
 * Changes made (summary):
 *  - Avoid recreating/copying the entire traveled polyline every frame.
 *  - Maintain a fixed-size "streak" (window) of recent points that is updated per-frame (bounded memory).
 *  - Throttle GeoJSON source updates to a sane frequency (SOURCE_UPDATE_MS) so we don't hammer styling every frame.
 *  - Reuse already found segment index for look-ahead camera calculation to avoid an extra binary search.
 *  - Batch append of intermediate points when index advances so we only do work proportional to new points.
 */
class RouteAnimationActivity : AppCompatActivity(), Choreographer.FrameCallback {

    companion object {
        private const val TAG = "RouteSync"
        // Adjust look-ahead for camera smoothness
        private const val LOOK_AHEAD_METERS = 80.0
        private const val CAMERA_POS_LERP = 0.04
        private const val CAMERA_BEARING_LERP = 0.015
        private const val UI_UPDATE_MS = 60L
        private const val BASE_ZOOM = 14.5
        private const val BASE_PITCH = 55.0
        private val SPEED_MULTIPLIERS = doubleArrayOf(1.0, 2.0, 5.0, 10.0, 0.5)

        // Performance tuning
        private const val STREAK_MAX_POINTS = 1200 // keep this small (bounded). Tune for quality/perf.
        private const val SOURCE_UPDATE_MS = 33L // ~30fps updates to the GeoJson source
        private const val DOT_UPDATE_MS = 16L // ~60fps for smooth dot movement
        private const val COMPLETED_UPDATE_MS = 1000L // ~1fps for completed route
    }

    // --- Data ---
    private var fullRoutePoints: List<Point> = emptyList()
    private var dists: DoubleArray = DoubleArray(0)
    private var eles: DoubleArray = DoubleArray(0)
    private var cumulativeElevationGain: DoubleArray = DoubleArray(0)

    private data class Peak(val name: String, val lat: Double, val lng: Double, val ele: Double, val icon: String)
    private var peaks: List<Peak> = emptyList()
    private var totalDist = 0.0
    private var nPoints = 0

    // --- Map & Layers ---
    private lateinit var mapView: MapView
    private var animatedSource: GeoJsonSource? = null
    private val ANIMATED_SOURCE_ID = "animated_source_id"

    // Completed route source (persistent trail)
    private var completedSource: GeoJsonSource? = null
    private val COMPLETED_SOURCE_ID = "completed_source"

    // --- Animation State ---
    private var currentDist = 0.0
    private var isAnimating = false
    private var isPaused = false
    private var isCompleted = false
    private var speedIdx = 0
    private var baseSpeed = 100.0
    private var lastFrameTimeNanos: Long = 0L

    // --- Dot Smoothing State ---
    private var smoothedLat = 0.0
    private var smoothedLng = 0.0
    private var isFirstFrame = true

    // Camera State
    private var camLat = 0.0
    private var camLng = 0.0
    private var camBearing = 0.0
    private var camPitch = BASE_PITCH
    private var camZoom = BASE_ZOOM

    // UI
    private lateinit var tvElevation: TextView
    private lateinit var tvDistance: TextView
    private lateinit var tvElevationLabel: TextView
    private lateinit var tvDistanceLabel: TextView
    private lateinit var btnSpeed: Button
    private lateinit var btnPauseResume: ImageButton
    private lateinit var seekBar: SeekBar
    private lateinit var statsOverlay: View
    private lateinit var controlsContainer: View
    private lateinit var cancelButton: View
    private var isControlsHidden = false
    private val mainHandler = Handler()
    private val ioThread = HandlerThread("io-thread").apply { start() }
    private val ioHandler = Handler(ioThread.looper)

    private var lastUiUpdateMs = 0L
    private var lastCameraUpdateMs = 0L

    // --- New fields for optimized updates ---
    private val traveledStreak = ArrayList<Point>(256) // bounded window of recent points
    private var lastAppendedIndex = -1
    private var lastSourceUpdateMs = 0L
    private var lastDotUpdateMs = 0L

    // --- Completed route tracking (monotonic) ---
    private var maxCompletedIndex = 0
    private var lastCompletedUpdateMs = 0L

    // Cached geometries to prevent blinking
    private var lastLineGeometry: LineString? = null
    private var lastDotGeometry: Point? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_route_animation)
        setupUI()

        val mapContainer = findViewById<FrameLayout>(R.id.mapContainer)
        mapView = MapView(this)
        mapContainer.addView(mapView)

        // Touch listener to detect clicks without interfering with map gestures
        var touchStartTime = 0L
        var touchStartX = 0f
        var touchStartY = 0f

        mapView.setOnTouchListener { view, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    touchStartTime = System.currentTimeMillis()
                    touchStartX = event.x
                    touchStartY = event.y
                    false // Don't consume, let map handle it
                }
                MotionEvent.ACTION_UP -> {
                    val touchDuration = System.currentTimeMillis() - touchStartTime
                    val deltaX = Math.abs(event.x - touchStartX)
                    val deltaY = Math.abs(event.y - touchStartY)

                    // Consider it a click if: short duration (< 300ms) and little movement (< 10px)
                    if (touchDuration < 300 && deltaX < 10 && deltaY < 10) {
                        isControlsHidden = !isControlsHidden
                        val alpha = if (isControlsHidden) 0.0f else 1.0f
                        controlsContainer.animate().alpha(alpha).setDuration(200).start()
                        cancelButton.animate().alpha(alpha).setDuration(200).start()
                    }
                    false // Don't consume, let map handle it
                }
                else -> false // Don't consume any other events, let map handle them
            }
        }

        // Reset camera
        mapView.getMapboxMap().setCamera(
            CameraOptions.Builder().zoom(0.0).center(Point.fromLngLat(0.0, 0.0)).build()
        )

        mapView.getMapboxMap().loadStyleUri(Style.SATELLITE_STREETS) { style ->
            mapView.compass.enabled = false
            mapView.scalebar.enabled = false

            setupTerrain(style)
            loadData(style)
        }
    }

    private fun setupUI() {
        tvElevation = findViewById(R.id.elevationValue)
        tvDistance = findViewById(R.id.distanceValue)
        tvElevationLabel = findViewById(R.id.elevationLabel)
        tvDistanceLabel = findViewById(R.id.distanceLabel)
        btnSpeed = findViewById(R.id.speedButton)
        btnPauseResume = findViewById(R.id.pauseResumeButton)
        seekBar = findViewById(R.id.routeSeekBar)
        statsOverlay = findViewById(R.id.statsOverlay)
        controlsContainer = findViewById(R.id.controlsContainer)
        cancelButton = findViewById(R.id.cancelButton)

        // Set label texts
        tvElevationLabel.text = "ELEVATION GAIN"
        tvDistanceLabel.text = "DISTANCE"

        seekBar.max = 1000

        val listener = object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                if (fromUser && totalDist > 0) {
                    val newDist = (progress.toDouble() / 1000.0) * totalDist
                    seekTo(newDist)
                }
            }

            override fun onStartTrackingTouch(seekBar: SeekBar?) { isPaused = true }
            override fun onStopTrackingTouch(seekBar: SeekBar?) { if (isAnimating) isPaused = false }
        }
        seekBar.setOnSeekBarChangeListener(listener)

        btnPauseResume.setOnClickListener {
            if (isCompleted) {
                // Restart from beginning
                seekTo(0.0)
                isCompleted = false
                isAnimating = true
                isPaused = false
                btnPauseResume.setImageResource(R.drawable.ic_pause)
                lastFrameTimeNanos = System.nanoTime()
                Choreographer.getInstance().postFrameCallback(this)
            } else {
                isPaused = !isPaused
                btnPauseResume.setImageResource(if (isPaused) R.drawable.ic_play else R.drawable.ic_pause)
            }
        }

        btnSpeed.setOnClickListener {
            speedIdx = (speedIdx + 1) % SPEED_MULTIPLIERS.size
            btnSpeed.text = "${SPEED_MULTIPLIERS[speedIdx]}x"
        }

        findViewById<View>(R.id.cancelButton).setOnClickListener { finish() }
    }

    private fun loadData(style: Style) {
        ioHandler.post {
            try {
                loadIcons(style)

                val coordsPath = intent.getStringExtra("coordinatesFile") ?: return@post
                val peaksPath = intent.getStringExtra("peaksFile")
                baseSpeed = intent.getDoubleExtra("baseSpeed", 100.0)

                val coordsJson = File(coordsPath).readText(StandardCharsets.UTF_8)
                val peaksJson = peaksPath?.let { File(it).readText(StandardCharsets.UTF_8) }

                parseRoute(coordsJson)
                if (peaksJson != null) parsePeaks(peaksJson)

                mainHandler.post {
                    initLayers(style)
                    startStartSequence()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Data Load Failed", e)
            }
        }
    }

    private fun parseRoute(json: String) {
        val arr = JSONArray(json)
        val len = arr.length()

        val points = ArrayList<Point>(len)
        dists = DoubleArray(len)
        eles = DoubleArray(len)
        cumulativeElevationGain = DoubleArray(len)

        var accDist = 0.0
        var accGain = 0.0

        for (i in 0 until len) {
            val obj = arr.getJSONObject(i)
            val lat = obj.getDouble("lat")
            val lng = obj.getDouble("lng")
            val ele = obj.optDouble("elevation", 0.0)

            points.add(Point.fromLngLat(lng, lat))
            eles[i] = ele

            if (i > 0) {
                val p1 = points[i - 1]
                accDist += haversine(p1.latitude(), p1.longitude(), lat, lng)
                val gain = ele - eles[i - 1]
                if (gain > 0) accGain += gain
            }
            dists[i] = accDist
            cumulativeElevationGain[i] = accGain
        }

        fullRoutePoints = points
        nPoints = len
        totalDist = accDist
    }

    private fun parsePeaks(json: String) {
        val arr = JSONArray(json)
        peaks = List(arr.length()) { i ->
            val obj = arr.getJSONObject(i)
            val ele = obj.getDouble("elevation")
            val color = getPeakColor(ele)
            Peak(obj.getString("name"), obj.getDouble("lat"), obj.getDouble("lng"), ele, "peak_$color")
        }
    }

    private fun getPeakColor(ele: Double): String {
        return when {
            ele > 8000 -> "black"
            ele > 6000 -> "burgundy"
            ele > 4000 -> "red"
            ele > 3000 -> "orange"
            ele > 2000 -> "yellow"
            else -> "green"
        }
    }

    private fun initLayers(style: Style) {
        // 1. BACKGROUND TRACK (The gray full path)
        val bgSourceId = "bg_source"
        style.addSource(GeoJsonSource.Builder(bgSourceId)
            .geometry(LineString.fromLngLats(fullRoutePoints))
            .build())

        style.addLayer(LineLayer("bg-layer", bgSourceId).apply {
            lineColor("#000000")
            lineWidth(6.0)
            lineOpacity(0.0)
            lineCap(LineCap.ROUND)
            lineJoin(LineJoin.ROUND)
        })

        // 2. ANIMATED SOURCE (Single source for both red line streak and blue dot)
        animatedSource = GeoJsonSource.Builder(ANIMATED_SOURCE_ID).build()
        style.addSource(animatedSource!!)

        // 3. COMPLETED ROUTE SOURCE (persistent full trail)
        completedSource = GeoJsonSource.Builder(COMPLETED_SOURCE_ID).build()
        style.addSource(completedSource!!)

        // 3. RED STREAK LINE LAYER (we only draw a bounded recent streak for performance)
        style.addLayer(LineLayer("anim-line-layer", ANIMATED_SOURCE_ID).apply {
            lineColor("#ED254E")
            lineWidth(6.0)
            lineCap(LineCap.ROUND)
            lineJoin(LineJoin.ROUND)
            filter(
                eq {
                    geometryType()
                    literal("LineString")
                }
            )
        })

        // 4. DOT LAYER
        style.addLayer(CircleLayer("anim-dot-layer", ANIMATED_SOURCE_ID).apply {
            circleRadius(8.0)
            circleColor("#3b82f6")
            circleStrokeWidth(3.0)
            circleStrokeColor("#ffffff")
            filter(
                eq {
                    geometryType()
                    literal("Point")
                }
            )
        })

        // 5. COMPLETED ROUTE LAYER (persistent trail)
        style.addLayer(LineLayer("completed-layer", COMPLETED_SOURCE_ID).apply {
            lineColor("#ED254E")
            lineWidth(6.0)
            lineCap(LineCap.ROUND)
            lineJoin(LineJoin.ROUND)
        })

        // 6. Peaks
        if (peaks.isNotEmpty()) {
            val peaksSourceId = "peaks_source"
            val peaksFeatures = peaks.map { peak: Peak ->
                val properties = JsonObject().apply {
                    addProperty("name", peak.name)
                    addProperty("icon", peak.icon)
                }
                Feature.fromGeometry(
                    Point.fromLngLat(peak.lng, peak.lat),
                    properties
                )
            }

            style.addSource(GeoJsonSource.Builder(peaksSourceId)
                .featureCollection(FeatureCollection.fromFeatures(peaksFeatures))
                .build())

            style.addLayer(SymbolLayer("peaks-layer", peaksSourceId).apply {
                iconImage(Expression.get("icon"))
                iconSize(0.75)
                iconAnchor(IconAnchor.BOTTOM)
                textField(Expression.get("name"))
                textColor("#ffffff")
                textSize(12.0)
                textOffset(listOf(0.0, 0.4))
                textAnchor(TextAnchor.TOP)
                textHaloColor("#000000")
                textHaloWidth(1.0)
            })
        }
    }

    private fun startStartSequence() {
        if (fullRoutePoints.isEmpty()) return

        val start = fullRoutePoints[0]
        camLat = start.latitude()
        camLng = start.longitude()

        // initialize streak with the first point
        traveledStreak.clear()
        traveledStreak.add(start)
        lastAppendedIndex = 0

        // Initialize cached geometries to prevent null checks
        lastLineGeometry = LineString.fromLngLats(listOf(start))
        lastDotGeometry = start

        mapView.getMapboxMap().flyTo(
            CameraOptions.Builder()
                .center(start)
                .zoom(BASE_ZOOM)
                .pitch(BASE_PITCH)
                .build(),
            mapAnimationOptions { duration(2000) }
        )

        mainHandler.postDelayed({
            isAnimating = true
            lastFrameTimeNanos = System.nanoTime()
            Choreographer.getInstance().postFrameCallback(this)
        }, 2100)
    }

    override fun doFrame(frameTimeNanos: Long) {
        if (!isAnimating) return

        val dt = ((frameTimeNanos - lastFrameTimeNanos) / 1_000_000.0).coerceAtMost(100.0)
        lastFrameTimeNanos = frameTimeNanos

        if (!isPaused) {
            val advance = (baseSpeed * SPEED_MULTIPLIERS[speedIdx]) * (dt / 1000.0)
            currentDist += advance
            if (currentDist >= totalDist) {
                currentDist = totalDist
                isCompleted = true
                isAnimating = false
                btnPauseResume.setImageResource(R.drawable.ic_rotate_ccw)

                // Show controls when animation completes so user can restart
                if (isControlsHidden) {
                    isControlsHidden = false
                    controlsContainer.animate().alpha(1.0f).setDuration(200).start()
                    cancelButton.animate().alpha(1.0f).setDuration(200).start()
                }
            }
        }

        updateMap(currentDist)

        if (isAnimating || isPaused) {
            Choreographer.getInstance().postFrameCallback(this)
        }
    }

    private fun updateMap(dist: Double) {
        val safeDist = dist.coerceIn(0.0, totalDist)

        // 1. Find the "Truth" Segment
        val (index, t) = findSegment(safeDist)

        // 2. Calculate Exact "Truth" Point (The Target)
        val p1 = fullRoutePoints[index]
        val p2 = if (index + 1 < nPoints) fullRoutePoints[index + 1] else p1

        val targetLat = p1.latitude() + (p2.latitude() - p1.latitude()) * t
        val targetLng = p1.longitude() + (p2.longitude() - p1.longitude()) * t
        val targetPoint = Point.fromLngLat(targetLng, targetLat)

        // 3. APPLY SMOOTHING (LERP) TO THE DOT
        if (isFirstFrame) {
            smoothedLat = targetLat
            smoothedLng = targetLng
            isFirstFrame = false
        } else {
            smoothedLat += (targetLat - smoothedLat) * 0.35
            smoothedLng += (targetLng - smoothedLng) * 0.35
        }
        val smoothedDotPoint = Point.fromLngLat(smoothedLng, smoothedLat)

        // 4. Efficiently maintain a bounded traveled streak (append only new points)
        if (index > lastAppendedIndex) {
            val from = (lastAppendedIndex + 1).coerceAtLeast(0)
            for (i in from..index) {
                traveledStreak.add(fullRoutePoints[i])
            }
            lastAppendedIndex = index

            // keep window bounded
            while (traveledStreak.size > STREAK_MAX_POINTS) {
                traveledStreak.removeAt(0)
            }
        }

        // Build displayed points (streak + smoothed dot position for perfect sync)
        // CRITICAL: Line must end at the exact same position as the dot for perfect sync
        val displayedPoints = ArrayList<Point>(traveledStreak.size + 1)
        displayedPoints.addAll(traveledStreak)
        displayedPoints.add(smoothedDotPoint) // Use smoothed position, not targetPoint
        val traveledLine = LineString.fromLngLats(displayedPoints)

        // 5. Synchronized updates: line and dot always updated together for perfect sync
        val now = System.currentTimeMillis()
        var needsUpdate = false

        // Update timers independently but apply changes together
        val shouldUpdateLine = (now - lastSourceUpdateMs >= SOURCE_UPDATE_MS)
        val shouldUpdateDot = (now - lastDotUpdateMs >= DOT_UPDATE_MS)

        if (shouldUpdateLine || shouldUpdateDot) {
            // Update both geometries with current state
            lastLineGeometry = traveledLine
            lastDotGeometry = smoothedDotPoint

            // Reset timers for the components that were updated
            if (shouldUpdateLine) {
                lastSourceUpdateMs = now
            }
            if (shouldUpdateDot) {
                lastDotUpdateMs = now
            }

            needsUpdate = true
        }

        // Apply updates together to maintain perfect sync
        if (needsUpdate) {
            val features = listOf(
                Feature.fromGeometry(lastLineGeometry!!),
                Feature.fromGeometry(lastDotGeometry!!)
            )
            try {
                animatedSource?.featureCollection(FeatureCollection.fromFeatures(features))
            } catch (e: Exception) {
                Log.w(TAG, "Failed to update animated source", e)
            }
        }

        // 6. Update completed route (monotonic, slow updates)
        maxCompletedIndex = max(maxCompletedIndex, index)
        if (now - lastCompletedUpdateMs > COMPLETED_UPDATE_MS) {
            lastCompletedUpdateMs = now
            val completedPoints = fullRoutePoints.subList(0, maxCompletedIndex + 1)
            try {
                completedSource?.geometry(LineString.fromLngLats(completedPoints))
            } catch (e: Exception) {
                Log.w(TAG, "Failed to update completed source", e)
            }
        }

        // 7. Update Camera & UI (reuse index to avoid duplicate binary searches)
        updateCameraReusingIndex(index, t, targetLat, targetLng, safeDist)
        updateStatsFromIndex(index, safeDist)
    }

    // Re-implemented camera update: reuse computed index/t and advance for lookahead (small loop)
    private fun updateCameraReusingIndex(index: Int, t: Double, targetLat: Double, targetLng: Double, currentDist: Double) {
        val lookDist = (currentDist + LOOK_AHEAD_METERS).coerceAtMost(totalDist)

        // Advance from index (cheap because LOOK_AHEAD_METERS is small)
        var lookIdx = index
        var lookT = t
        while (lookIdx < nPoints - 1 && dists[lookIdx + 1] < lookDist) lookIdx++
        if (lookIdx >= nPoints - 1) {
            lookT = 0.0
        } else {
            val segStart = dists[lookIdx]
            val segEnd = dists[lookIdx + 1]
            val segLen = segEnd - segStart
            lookT = if (segLen > 0) (lookDist - segStart) / segLen else 0.0
        }

        val lp1 = fullRoutePoints[lookIdx]
        val lp2 = if (lookIdx + 1 < nPoints) fullRoutePoints[lookIdx + 1] else lp1
        val lookLat = lp1.latitude() + (lp2.latitude() - lp1.latitude()) * lookT
        val lookLng = lp1.longitude() + (lp2.longitude() - lp1.longitude()) * lookT

        val targetBearing = getBearing(targetLat, targetLng, lookLat, lookLng)

        var diff = targetBearing - camBearing
        while (diff > 180) diff -= 360
        while (diff < -180) diff += 360
        camBearing += diff * CAMERA_BEARING_LERP

        camLat += (targetLat - camLat) * CAMERA_POS_LERP
        camLng += (targetLng - camLng) * CAMERA_POS_LERP

        val now = System.currentTimeMillis()
        if (now - lastCameraUpdateMs > 15) {
            lastCameraUpdateMs = now
            mapView.getMapboxMap().setCamera(
                CameraOptions.Builder()
                    .center(Point.fromLngLat(camLng, camLat))
                    .bearing(camBearing)
                    .pitch(camPitch)
                    .zoom(camZoom)
                    .build()
            )
        }
    }

    private fun updateStatsFromIndex(idx: Int, d: Double) {
        val now = System.currentTimeMillis()
        if (now - lastUiUpdateMs < UI_UPDATE_MS) return
        lastUiUpdateMs = now

        val gain = cumulativeElevationGain[idx]

        mainHandler.post {
            tvDistance.text = String.format(Locale.US, "%.2f", d / 1000.0)
            tvElevation.text = String.format(Locale.US, "%.0f", gain)
            seekBar.progress = ((d / totalDist) * 1000).toInt()
        }
    }

    private fun findSegment(d: Double): Pair<Int, Double> {
        var low = 0
        var high = nPoints - 1
        while (low <= high) {
            val mid = (low + high) ushr 1
            if (dists[mid] < d) low = mid + 1
            else high = mid - 1
        }
        val idx = (low - 1).coerceAtLeast(0)

        if (idx >= nPoints - 1) return Pair(nPoints - 1, 0.0)

        val segStart = dists[idx]
        val segEnd = dists[idx + 1]
        val segLen = segEnd - segStart
        val t = if (segLen > 0) (d - segStart) / segLen else 0.0

        return Pair(idx, t)
    }

    private fun seekTo(d: Double) {
        currentDist = d
        isFirstFrame = true
        lastDotUpdateMs = 0L

        // Reset completed route index for scrubbing
        val (idx, _) = findSegment(d)
        maxCompletedIndex = idx // Allow immediate dot update on scrub

        // rebuild streak to be consistent with seek position (bounded by STREAK_MAX_POINTS)
        lastAppendedIndex = idx
        traveledStreak.clear()

        // only add up to STREAK_MAX_POINTS points ending at idx
        val startIndex = max(0, idx - STREAK_MAX_POINTS + 1)
        for (i in startIndex..idx) traveledStreak.add(fullRoutePoints[i])

        // Force one immediate update of the source (no throttle) so the UI updates on scrub
        try {
            val (index2, t2) = findSegment(d)
            val p1 = fullRoutePoints[index2]
            val p2 = if (index2 + 1 < nPoints) fullRoutePoints[index2 + 1] else p1
            val targetLat = p1.latitude() + (p2.latitude() - p1.latitude()) * t2
            val targetLng = p1.longitude() + (p2.longitude() - p1.longitude()) * t2
            val targetPoint = Point.fromLngLat(targetLng, targetLat)

            val displayedPoints = ArrayList<Point>(traveledStreak.size + 1)
            displayedPoints.addAll(traveledStreak)
            displayedPoints.add(targetPoint)
            val traveledLine = LineString.fromLngLats(displayedPoints)

            val smoothedDotPoint = Point.fromLngLat(targetLng, targetLat)

            // Update cached geometries
            lastLineGeometry = traveledLine
            lastDotGeometry = smoothedDotPoint

            val features = listOf(Feature.fromGeometry(traveledLine), Feature.fromGeometry(smoothedDotPoint))
            animatedSource?.featureCollection(FeatureCollection.fromFeatures(features))
        } catch (e: Exception) {
            Log.w(TAG, "seekTo source update failed", e)
        }

        if (!isAnimating) {
            // updateMap already handled everything needed
        }
    }

    // Helpers
    private fun haversine(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val R = 6371000.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2).pow(2) + cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLon / 2).pow(2)
        return R * 2 * atan2(sqrt(a), sqrt(1 - a))
    }

    private fun getBearing(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val y = sin(Math.toRadians(lon2 - lon1)) * cos(Math.toRadians(lat2))
        val x = cos(Math.toRadians(lat1)) * sin(Math.toRadians(lat2)) -
                sin(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * cos(Math.toRadians(lon2 - lon1))
        return (Math.toDegrees(atan2(y, x)) + 360) % 360
    }

    private fun loadIcons(style: Style) {
        val colors = arrayOf("green", "yellow", "orange", "red", "burgundy", "black")
        for (color in colors) {
            try {
                val bitmap = BitmapFactory.decodeStream(
                    assets.open("public/icons/altitude/map/ic_mountain_${color}_map.png")
                )
                if (bitmap != null) {
                    style.addImage("peak_$color", bitmap)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to load peak icon for color: $color", e)
            }
        }
    }

    private fun setupTerrain(style: Style) {
        try {
            style.addSource(RasterDemSource.Builder("mapbox-dem").url("mapbox://mapbox.mapbox-terrain-dem-v1").tileSize(514).build())
            style.setTerrain(terrain("mapbox-dem"))
        } catch (_: Exception) {}
    }

    override fun onDestroy() {
        super.onDestroy()
        isAnimating = false
        Choreographer.getInstance().removeFrameCallback(this)
        ioThread.quitSafely()
    }
}
