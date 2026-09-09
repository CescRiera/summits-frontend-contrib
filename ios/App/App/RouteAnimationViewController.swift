import UIKit
import MapboxMaps
import Turf
import CoreLocation
import Combine
import WebKit

// Extension for coerceAtLeast functionality
extension Int {
    func coerceAtLeast(minimumValue: Int) -> Int {
        return Swift.max(self, minimumValue)
    }
}

// MARK: - Close Notification
extension Notification.Name {
    static let routeAnimationCloseRequested = Notification.Name("CloseRouteAnimation")
}

// MARK: - Models
struct RouteCoordinate: Codable {
    let lat: Double
    let lng: Double
    let elevation: Double?
}

struct Peak: Codable {
    let name: String
    let lat: Double
    let lng: Double
    let elevation: Double
}

struct InterpolationResult {
    var lat: Double = 0.0
    var lng: Double = 0.0
    var ele: Double = 0.0
    var index: Int = 0 // Track index for cursor-based searching

    mutating func update(lat: Double, lng: Double, ele: Double, index: Int) {
        self.lat = lat
        self.lng = lng
        self.ele = ele
        self.index = index
    }
}

final class RouteAnimationViewController: UIViewController, UIGestureRecognizerDelegate {

    // MARK: - Configuration & Constants
    private let baseZoom: Double = 13.5
    private let basePitch: Double = 60.0
    private let lookAheadMeters: Double = 500.0

    // MARK: - API Inputs (from plugin)
    var totalDistanceExpected: Double = 0.0
    var totalElevation: Double = 0.0
    
    // Optimized Lerp constants for high-refresh screens
    private let cameraPosLerp: Double = 0.05
    private let cameraBearingLerp: Double = 0.01
    private let dotPosLerp: Double = 0.45 // Snappier dot
    private let routeTrimLerp: Double = 0.25

    // Optimization constants
    private let uiUpdateInterval: CFTimeInterval = 0.033 // ~30fps for UI labels is plenty
    private let cameraUpdateInterval: CFTimeInterval = 0.016 // ~60fps for Camera
    private let cameraMoveThreshold: Double = 0.0 // Reduced to 0 for perfectly smooth micro-movements

    // Performance tuning (matching Android)
    private let streakMaxPoints = 1200 // keep this small (bounded). Tune for quality/perf.
    private let geoJsonUpdateInterval: CFTimeInterval = 0.016 // Unified smooth 60fps for map features
    private let completedUpdateInterval: CFTimeInterval = 1.0 // ~1fps for completed route

    // MARK: - API Inputs
    var coordinatesData: String?
    var peaksData: String?
    var baseSpeed: Double = 150.0
    var routeName: String = "Route"
    var elevationLabel: String = "ELEVATION GAIN"
    var distanceLabel: String = "DISTANCE"

    // MARK: - Optimized State
    private var lats = ContiguousArray<Double>()
    private var lngs = ContiguousArray<Double>()
    private var eles = ContiguousArray<Double>() // stored GPS elevations
    private var demEles = ContiguousArray<Double>() // DEM-corrected elevations
    private var dists = ContiguousArray<Double>()
    private var cumulativeGain = ContiguousArray<Double>() // O(1) elevation gain lookup

    private var nPoints = 0
    private var totalDistance = 0.0
    private var currentDistance = 0.0
    private var currentIndexCursor = 0 // Optimization: avoids binary search every frame

    private var isAnimating = false
    private var isPaused = false
    private var isCompleted = false
    private var isControlsHidden = false
    private var isSeeking = false // Track when user is seeking with slider

    private var speedMultipliers: [Double] = [1.0, 2.0, 5.0, 0.5]
    private var speedIndex: Int = 0

    private var camLat = 0.0, camLng = 0.0, camBearing = 0.0
    private var dotLat = 0.0, dotLng = 0.0
    private var routeTrimProgress = 0.0

    // Frame timing tracking
    private var lastPhysicsTime: CFTimeInterval = 0.0

    // Camera throttling state
    private var lastSetCamLat = 0.0, lastSetCamLng = 0.0, lastSetCamBearing = 0.0

    // MARK: - UI Components
    private var mapView: MapView!
    
    // Stats Overlay (Always Visible)
    private let statsOverlay = UIView()
    private let titleLabel = UILabel()
    private let elevationValue = UILabel()
    private let elevationUnit = UILabel()
    private let distanceValue = UILabel()
    private let distanceUnit = UILabel()
    
    // Toggleable UI
    private let controlsContainer = UIView()
    private let pauseResumeButton = UIButton(type: .custom)
    private let speedButton = UIButton(type: .system)
    private let closeButton = UIButton(type: .system)
    private let progressSlider = UISlider()

    // --- Map Sources & Layers (Android-style methodology) ---
    private let routeSourceId = "route-source"
    private let routeLayerId = "route-layer"
    private let animatedSourceId = "animated-source"
    private let animatedDotSourceId = "animated-dot-source"
    private let animatedLineLayerId = "animated-line-layer"
    private let animatedDotLayerId = "animated-dot-layer"
    private let completedSourceId = "completed-source"
    private let completedLayerId = "completed-layer"
    private let peaksSourceId = "peaks-source"
    private let peaksLayerId = "peaks-layer"

    private var reusableDotPoint = Point(CLLocationCoordinate2D(latitude: 0, longitude: 0))
    private var resCurrent = InterpolationResult()
    private var resLookAhead = InterpolationResult()

    // --- New fields for optimized updates (matching Android) ---
    private var traveledStreak = [CLLocationCoordinate2D]() // bounded window of recent points
    private var lastAppendedIndex = -1
    private var lastGeoJsonUpdateTime: CFTimeInterval = 0.0
    private var maxCompletedIndex = 0
    private var lastCompletedUpdateTime: CFTimeInterval = 0.0

    // Cached geometries to prevent blinking
    private var lastLineGeometry: LineString? = nil
    private var lastDotGeometry: Point? = nil

    private var displayLink: CADisplayLink?
    private var lastFrameTime: CFTimeInterval = 0.0
    private var lastUIUpdateTime: CFTimeInterval = 0.0
    private var lastCameraUpdateTime: CFTimeInterval = 0.0
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupMap()
        setupGestures()
    }
    
    deinit {
        print("RouteAnimationViewController deinit ✅")
        displayLink?.invalidate()
        displayLink = nil
    }

    override var prefersStatusBarHidden: Bool { true }

    // MARK: - UI Setup
    private func setupUI() {
        view.backgroundColor = .black
        
        // 1. Stats Overlay (TOP - Always Visible)
        statsOverlay.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(statsOverlay)
        
        let gradient = CAGradientLayer()
        gradient.colors = [UIColor.black.withAlphaComponent(0.8).cgColor, UIColor.clear.cgColor]
        gradient.locations = [0, 1]
        statsOverlay.layer.insertSublayer(gradient, at: 0)
        
        titleLabel.text = "SUMMITS"
        titleLabel.textColor = .white
        titleLabel.font = .systemFont(ofSize: 24, weight: .semibold)
        titleLabel.textAlignment = .center
        // Add letter spacing (approximate iOS equivalent of Android's letterSpacing="0.18")
        let attributedString = NSMutableAttributedString(string: "SUMMITS")
        attributedString.addAttribute(.kern, value: 4.32, range: NSRange(location: 0, length: attributedString.length))
        titleLabel.attributedText = attributedString
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        statsOverlay.addSubview(titleLabel)
        
        let statStack = UIStackView()
        statStack.axis = .horizontal
        statStack.distribution = .fillEqually
        statStack.spacing = 20 // Add gap between stats
        statStack.translatesAutoresizingMaskIntoConstraints = false
        statsOverlay.addSubview(statStack)
        
        [createStatStack(label: elevationLabel, valueLabel: elevationValue, unitLabel: elevationUnit, unitText: "m"),
         createStatStack(label: distanceLabel, valueLabel: distanceValue, unitLabel: distanceUnit, unitText: "km")].forEach { statStack.addArrangedSubview($0) }

        // 2. Controls (BOTTOM - Toggleable)
        controlsContainer.backgroundColor = UIColor(white: 0.1, alpha: 0.85)
        controlsContainer.layer.cornerRadius = 12
        controlsContainer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(controlsContainer)
        
        pauseResumeButton.tintColor = .white
        pauseResumeButton.setImage(UIImage(systemName: "pause.fill"), for: .normal)
        pauseResumeButton.addTarget(self, action: #selector(handlePauseResume), for: .touchUpInside)
        
        speedButton.setTitle("1x", for: .normal)
        speedButton.setTitleColor(.white, for: .normal)
        speedButton.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        speedButton.addTarget(self, action: #selector(handleSpeedToggle), for: .touchUpInside)
        
        // Robust dragging events for flawless scrub mechanics
        progressSlider.addTarget(self, action: #selector(handleScrubBegin), for: .touchDown)
        progressSlider.addTarget(self, action: #selector(handleSeek), for: .valueChanged)
        progressSlider.addTarget(self, action: #selector(handleScrubEnd), for: [.touchUpInside, .touchUpOutside])
        progressSlider.minimumValue = 0
        progressSlider.maximumValue = 1
        progressSlider.value = 0
        progressSlider.minimumTrackTintColor = .white
        progressSlider.maximumTrackTintColor = UIColor(white: 1, alpha: 0.3)
        progressSlider.thumbTintColor = .white

        // Make slider track thinner and handle smaller, but do NOT scale overall width/length
        progressSlider.transform = .identity // Do not scale the X axis; keep native width

        let thumbImage = UIImage(systemName: "circle.fill")?.withTintColor(.white, renderingMode: .alwaysOriginal)
        progressSlider.setThumbImage(thumbImage, for: .normal)
        progressSlider.setThumbImage(thumbImage, for: .highlighted)
        progressSlider.setThumbImage(thumbImage, for: .selected)

        // Optionally: Make track thinner by subclassing, if needed.

        let bottomStack = UIStackView(arrangedSubviews: [pauseResumeButton, progressSlider, speedButton])
        bottomStack.spacing = 8
        bottomStack.alignment = .center
        bottomStack.translatesAutoresizingMaskIntoConstraints = false
        controlsContainer.addSubview(bottomStack)

        // 3. Close Button (TOP RIGHT - Always Visible)
        closeButton.setTitle("✕", for: .normal)
        closeButton.setTitleColor(.white, for: .normal)
        closeButton.titleLabel?.font = .systemFont(ofSize: 20, weight: .medium)
        closeButton.backgroundColor = UIColor(white: 0, alpha: 0.4)
        closeButton.layer.cornerRadius = 20
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        closeButton.addTarget(self, action: #selector(handleClose), for: .touchUpInside)
        closeButton.isUserInteractionEnabled = true
        view.addSubview(closeButton)
        view.bringSubviewToFront(closeButton)

        NSLayoutConstraint.activate([
            statsOverlay.topAnchor.constraint(equalTo: view.topAnchor),
            statsOverlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            statsOverlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            statsOverlay.heightAnchor.constraint(equalToConstant: 200),
            
            titleLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 10),
            titleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            
            statStack.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 25),
            statStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 40),
            statStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -40),
            
            controlsContainer.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -10),
            controlsContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            controlsContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            controlsContainer.heightAnchor.constraint(equalToConstant: 50),
            
            bottomStack.leadingAnchor.constraint(equalTo: controlsContainer.leadingAnchor, constant: 16),
            bottomStack.trailingAnchor.constraint(equalTo: controlsContainer.trailingAnchor, constant: -16),
            bottomStack.centerYAnchor.constraint(equalTo: controlsContainer.centerYAnchor),
            
            pauseResumeButton.widthAnchor.constraint(equalToConstant: 44),
            speedButton.widthAnchor.constraint(equalToConstant: 50),
            speedButton.heightAnchor.constraint(equalToConstant: 30),
            
            closeButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 10),
            closeButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            closeButton.widthAnchor.constraint(equalToConstant: 40),
            closeButton.heightAnchor.constraint(equalToConstant: 40)
        ])
        
        view.layoutIfNeeded()
        gradient.frame = statsOverlay.bounds
    }

    private func createStatStack(label: String, valueLabel: UILabel, unitLabel: UILabel, unitText: String) -> UIStackView {
        let title = UILabel()
        title.text = label.uppercased()
        title.font = .systemFont(ofSize: 12, weight: .bold)
        title.textColor = .white
        title.textAlignment = .center
        // Add small letter spacing for labels (approximate Android's letterSpacing="0.02")
        let labelAttributedString = NSMutableAttributedString(string: label.uppercased())
        labelAttributedString.addAttribute(.kern, value: 0.24, range: NSRange(location: 0, length: labelAttributedString.length))
        title.attributedText = labelAttributedString

        valueLabel.font = .systemFont(ofSize: 28, weight: .bold)
        valueLabel.textColor = .white
        valueLabel.textAlignment = .center
        valueLabel.text = "0"

        unitLabel.text = unitText
        unitLabel.font = .systemFont(ofSize: 12)
        unitLabel.textColor = .white
        unitLabel.textAlignment = .center

        let stack = UIStackView(arrangedSubviews: [title, valueLabel, unitLabel])
        stack.axis = .vertical
        stack.spacing = 4 // Small spacing between elements
        return stack
    }

    // MARK: - Mapbox Setup
    private func setupMap() {
        // Start at Zoom 0 (World view)
        let options = MapInitOptions(
            cameraOptions: CameraOptions(center: CLLocationCoordinate2D(latitude: 0, longitude: 0), zoom: 0),
            styleURI: StyleURI.satelliteStreets
        )
        mapView = MapView(frame: view.bounds, mapInitOptions: options)
        mapView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.insertSubview(mapView, at: 0)

        // HIDE COMPASS AND SCALE BAR
        mapView.ornaments.options.compass.visibility = .hidden
        mapView.ornaments.options.scaleBar.visibility = .hidden

        mapView.mapboxMap.onMapLoaded.observeNext { [weak self] _ in
            self?.setupTerrain()
            self?.hideNativeLabels()
            self?.loadPeakIcons()
            self?.parseData()
        }.store(in: &cancellables)
    }

    private func setupTerrain() {
        var demSource = RasterDemSource(id: "mapbox-dem")
        demSource.url = "mapbox://mapbox.mapbox-terrain-dem-v1"
        try? mapView.mapboxMap.addSource(demSource)
        var terrain = Terrain(sourceId: "mapbox-dem")
        terrain.exaggeration = .constant(1.2)
        try? mapView.mapboxMap.setTerrain(terrain)
    }

    /// Hide all native symbol layers (place names, road labels, POIs, etc.) from the base style
    private func hideNativeLabels() {
        let allLayers = mapView.mapboxMap.allLayerIdentifiers
        for layerInfo in allLayers {
            if layerInfo.type == .symbol {
                try? mapView.mapboxMap.updateLayer(withId: layerInfo.id, type: SymbolLayer.self) { layer in
                    layer.visibility = .constant(.none)
                }
            }
        }
    }

    private func loadPeakIcons() {
        let colors = ["red", "yellow", "green", "orange", "burgundy", "black"]
        for color in colors {
            // Try different paths for Capacitor assets
            var image: UIImage?

            // Try direct bundle path (Capacitor copies public assets to bundle root)
            if let bundlePath = Bundle.main.path(forResource: "ic_mountain_\(color)_map", ofType: "png", inDirectory: "icons/altitude/map"),
               let loadedImage = UIImage(contentsOfFile: bundlePath) {
                image = loadedImage
            }
            // Try without subdirectory
            else if let bundlePath = Bundle.main.path(forResource: "ic_mountain_\(color)_map", ofType: "png"),
                    let loadedImage = UIImage(contentsOfFile: bundlePath) {
                image = loadedImage
            }
            // Try with full public path
            else if let bundlePath = Bundle.main.path(forResource: "ic_mountain_\(color)_map", ofType: "png", inDirectory: "public/icons/altitude/map"),
                    let loadedImage = UIImage(contentsOfFile: bundlePath) {
                image = loadedImage
            }

            if let image = image {
                try? mapView.mapboxMap.addImage(image, id: "peak_\(color)")
            }
        }
    }

    // MARK: - Professional Pre-Smoothing & Data Processing
    private func parseData() {
        guard let coordJson = coordinatesData?.data(using: .utf8) else { return }
        titleLabel.text = "SUMMITS"

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            do {
                let rawCoords = try JSONDecoder().decode([RouteCoordinate].self, from: coordJson)
                
                // Professional Gaussian smoothing to completely eliminate GPS zig-zags
                // This means the animation path is a beautifully graceful spline.
                let coords = self.applyGaussianSmoothing(to: rawCoords, passes: 3)
                
                let count = coords.count
                self.nPoints = count
                var dAcc = 0.0
                var gAcc = 0.0

                self.lats.reserveCapacity(count)
                self.lngs.reserveCapacity(count)
                self.demEles.reserveCapacity(count)
                self.dists.reserveCapacity(count)
                self.cumulativeGain.reserveCapacity(count)

                // Process highly optimized smoothed coordinates
                for i in 0..<count {
                    let c = coords[i]
                    self.lats.append(c.lat)
                    self.lngs.append(c.lng)
                    self.demEles.append(c.elevation ?? 0.0)

                    if i > 0 {
                        dAcc += self.haversine(lat1: self.lats[i-1], lon1: self.lngs[i-1], lat2: self.lats[i], lon2: self.lngs[i])
                        let diff = self.demEles[i] - self.demEles[i-1]
                        if diff > 0 { gAcc += diff }
                    }
                    self.dists.append(dAcc)
                    self.cumulativeGain.append(gAcc)
                }

                self.totalDistance = dAcc

                DispatchQueue.main.async {
                    self.setupLayersAndStartFlyTo()
                }
            } catch { print("JSON Parsing Error: \(error)") }
        }
    }

    /// Applies a standard 1-2-1 Gaussian blur to geographical coordinates
    private func applyGaussianSmoothing(to coords: [RouteCoordinate], passes: Int) -> [RouteCoordinate] {
        guard coords.count > 4 else { return coords }
        var current = coords
        
        for _ in 0..<passes {
            var next = [RouteCoordinate]()
            next.reserveCapacity(current.count)
            next.append(current[0]) // Pin start
            
            for i in 1..<(current.count - 1) {
                let p1 = current[i-1], p2 = current[i], p3 = current[i+1]
                let lat = (p1.lat + 2.0 * p2.lat + p3.lat) / 4.0
                let lng = (p1.lng + 2.0 * p2.lng + p3.lng) / 4.0
                let ele = ((p1.elevation ?? 0) + 2.0 * (p2.elevation ?? 0) + (p3.elevation ?? 0)) / 4.0
                next.append(RouteCoordinate(lat: lat, lng: lng, elevation: ele))
            }
            
            next.append(current.last!) // Pin end
            current = next
        }
        return current
    }

    private func setupLayersAndStartFlyTo() {
        guard nPoints > 0 else { return }

        // Setup Map Layers (Android-style methodology)
        let coords = (0..<nPoints).map { CLLocationCoordinate2D(latitude: lats[$0], longitude: lngs[$0]) }

        // 1. BACKGROUND TRACK (The gray full path - now transparent)
        var bgSource = GeoJSONSource(id: routeSourceId)
        bgSource.data = .feature(Feature(geometry: LineString(coords)))
        var bgLayer = LineLayer(id: routeLayerId, source: routeSourceId)
        bgLayer.lineColor = .constant(StyleColor(UIColor.clear))
        bgLayer.lineWidth = .constant(6.0)
        bgLayer.lineOpacity = .constant(0.0) // Completely transparent
        bgLayer.lineCap = .constant(.round)
        bgLayer.lineJoin = .constant(.round)

        // 2. ANIMATED SOURCE (Red line streak)
        var animatedSource = GeoJSONSource(id: animatedSourceId)
        try? mapView.mapboxMap.addSource(animatedSource)

        // 2b. ANIMATED DOT SOURCE (Separate source for smooth 60fps)
        var animatedDotSource = GeoJSONSource(id: animatedDotSourceId)
        try? mapView.mapboxMap.addSource(animatedDotSource)

        // 3. COMPLETED ROUTE SOURCE (persistent full trail)
        var completedSource = GeoJSONSource(id: completedSourceId)
        try? mapView.mapboxMap.addSource(completedSource)

        // 4. RED STREAK LINE LAYER (we only draw a bounded recent streak for performance)
        var animLineLayer = LineLayer(id: animatedLineLayerId, source: animatedSourceId)
        animLineLayer.lineColor = .constant(StyleColor(.systemRed))
        animLineLayer.lineWidth = .constant(6.0)
        animLineLayer.lineCap = .constant(.round)
        animLineLayer.lineJoin = .constant(.round)
        // Filter for LineString geometries only
        animLineLayer.filter = Exp(.eq) {
            Exp(.geometryType)
            "LineString"
        }

        // 5. DOT LAYER
        var animDotLayer = CircleLayer(id: animatedDotLayerId, source: animatedDotSourceId)
        animDotLayer.circleRadius = .constant(8.0)
        animDotLayer.circleColor = .constant(StyleColor(.systemBlue))
        animDotLayer.circleStrokeWidth = .constant(3.0)
        animDotLayer.circleStrokeColor = .constant(StyleColor(.white))
        // No filter needed since it's a dedicated source

        // 6. COMPLETED ROUTE LAYER (persistent trail)
        var completedLayer = LineLayer(id: completedLayerId, source: completedSourceId)
        completedLayer.lineColor = .constant(StyleColor(.systemRed))
        completedLayer.lineWidth = .constant(6.0)
        completedLayer.lineCap = .constant(.round)
        completedLayer.lineJoin = .constant(.round)

        // Add all layers and sources
        try? mapView.mapboxMap.addSource(bgSource)
        try? mapView.mapboxMap.addLayer(bgLayer)
        try? mapView.mapboxMap.addLayer(animLineLayer)
        try? mapView.mapboxMap.addLayer(animDotLayer)
        try? mapView.mapboxMap.addLayer(completedLayer)

        setupPeaksLayer()

        // Fly to initial point
        let startCoord = coords[0]
        let initialCamera = CameraOptions(center: startCoord, zoom: baseZoom, bearing: 0, pitch: basePitch)

        mapView.camera.fly(to: initialCamera, duration: 3.5) { [weak self] (_: UIViewAnimatingPosition) in
            // Make background route visible after fly-to completes
            try? self?.mapView.mapboxMap.style.setLayerProperty(for: self!.routeLayerId, property: "line-opacity", value: 1.0)
            self?.startRouteAnimation()
        }
    }

    private func setupPeaksLayer() {
        guard let pData = peaksData?.data(using: .utf8),
              let peaks = try? JSONDecoder().decode([Peak].self, from: pData) else { return }

        let iconSize: CGFloat = 45
        let labelHeight: CGFloat = 18
        let iconToTextSpacing: CGFloat = 2
        let containerWidth: CGFloat = 160
        let containerHeight: CGFloat = iconSize + iconToTextSpacing + labelHeight

        for peak in peaks {
            let coordinate = CLLocationCoordinate2D(latitude: peak.lat, longitude: peak.lng)
            let color = getPeakColor(peak.elevation)

            // Clear container — no overlay
            let container = UIView(frame: CGRect(x: 0, y: 0, width: containerWidth, height: containerHeight))
            container.backgroundColor = .clear
            container.isUserInteractionEnabled = false

            // Icon (centered, at the top of the container)
            let iconX = (containerWidth - iconSize) / 2.0
            let iconView = UIImageView(frame: CGRect(x: iconX, y: 0, width: iconSize, height: iconSize))
            iconView.contentMode = .scaleAspectFit

            // Try to load the peak icon from bundle
            if let bundlePath = Bundle.main.path(forResource: "ic_mountain_\(color)_map", ofType: "png", inDirectory: "icons/altitude/map"),
               let img = UIImage(contentsOfFile: bundlePath) {
                iconView.image = img
            } else if let bundlePath = Bundle.main.path(forResource: "ic_mountain_\(color)_map", ofType: "png"),
                      let img = UIImage(contentsOfFile: bundlePath) {
                iconView.image = img
            } else if let bundlePath = Bundle.main.path(forResource: "ic_mountain_\(color)_map", ofType: "png", inDirectory: "public/icons/altitude/map"),
                      let img = UIImage(contentsOfFile: bundlePath) {
                iconView.image = img
            }

            // Label below icon with shadow for readability
            let label = UILabel(frame: CGRect(x: 0, y: iconSize + iconToTextSpacing, width: containerWidth, height: labelHeight))
            label.text = peak.name
            label.textColor = .white
            label.font = .systemFont(ofSize: 12, weight: .medium)
            label.textAlignment = .center
            label.layer.shadowColor = UIColor.black.cgColor
            label.layer.shadowOffset = CGSize(width: 0, height: 1.5)
            label.layer.shadowRadius = 2.0
            label.layer.shadowOpacity = 1.0
            // Extra shadow pass for stronger effect
            label.layer.masksToBounds = false
            label.layer.shouldRasterize = true
            label.layer.rasterizationScale = UIScreen.main.scale

            container.addSubview(iconView)
            container.addSubview(label)

            // anchor=.bottom with offsetY to pin coordinate at the icon's bottom
            // (shift up by the label + spacing that hangs below the icon)
            let options = ViewAnnotationOptions(
                geometry: Point(coordinate),
                width: containerWidth,
                height: containerHeight,
                allowOverlap: true,
                anchor: .bottom,
                offsetY: iconToTextSpacing - labelHeight
            )

            try? mapView.viewAnnotations.add(container, options: options)
        }
    }

    private func getPeakColor(_ ele: Double) -> String {
        if ele > 8000 { return "black" }
        if ele > 6000 { return "burgundy" }
        if ele > 4000 { return "red" }
        if ele > 3000 { return "orange" }
        if ele > 2000 { return "yellow" }
        return "green"
    }

    // MARK: - Core Animation Logic (Highly Optimized)
    private func startRouteAnimation() {
        camLat = lats[0]; camLng = lngs[0]; dotLat = lats[0]; dotLng = lngs[0]
        lastPhysicsTime = CACurrentMediaTime()

        // Initialize traveled streak with the first point (matching Android)
        traveledStreak.removeAll(keepingCapacity: true)
        traveledStreak.append(CLLocationCoordinate2D(latitude: lats[0], longitude: lngs[0]))
        lastAppendedIndex = 0

        // Initialize cached geometries to prevent null checks
        lastLineGeometry = LineString([CLLocationCoordinate2D(latitude: lats[0], longitude: lngs[0])])
        lastDotGeometry = Point(CLLocationCoordinate2D(latitude: lats[0], longitude: lngs[0]))

        isAnimating = true
        displayLink = CADisplayLink(target: self, selector: #selector(animationStep))
        displayLink?.preferredFramesPerSecond = 60
        displayLink?.add(to: .main, forMode: .common)
        lastFrameTime = CACurrentMediaTime()
    }

    @objc private func animationStep() {
        guard isAnimating && !isPaused && !isCompleted else { return }
        let now = CACurrentMediaTime()
        let dt = min(now - lastFrameTime, 0.1)
        lastFrameTime = now
        
        currentDistance += (baseSpeed * speedMultipliers[speedIndex]) * dt
        if currentDistance >= totalDistance {
            currentDistance = totalDistance
            isCompleted = true
            updatePauseResumeUI()
        }
        updateVisuals()
    }

    private func updateVisuals() {
        let currentTime = CACurrentMediaTime()
        let physDt = min(currentTime - lastPhysicsTime, 0.1)
        lastPhysicsTime = currentTime

        // 1. Get current position using cursor-optimized interpolation
        interpolateCursor(at: currentDistance, result: &resCurrent)

        // 2. Calculate Exact "Truth" Point (The Target)
        let targetPoint = CLLocationCoordinate2D(latitude: resCurrent.lat, longitude: resCurrent.lng)

        // 3. DOT POSITION
        // With the path pre-smoothed via Gaussian, the dot precisely follows the beautifully
        // curved tail. No divergence, no micro-jitter, perfect rigid tracking.
        dotLat = resCurrent.lat
        dotLng = resCurrent.lng
        let smoothedDotPoint = CLLocationCoordinate2D(latitude: dotLat, longitude: dotLng)

        // 4. Efficiently maintain a bounded traveled streak
        // If user scrubbed backwards or forwards a large amount, rebuild strictly
        if isSeeking || resCurrent.index < lastAppendedIndex {
            traveledStreak.removeAll(keepingCapacity: true)
            let startIndex = max(0, resCurrent.index - streakMaxPoints + 1)
            for i in startIndex...resCurrent.index {
                traveledStreak.append(CLLocationCoordinate2D(latitude: lats[i], longitude: lngs[i]))
            }
            lastAppendedIndex = resCurrent.index
        } else if resCurrent.index > lastAppendedIndex {
            // Normal forward playback: append only new points
            let from = (lastAppendedIndex + 1).coerceAtLeast(minimumValue: 0)
            for i in from...resCurrent.index {
                traveledStreak.append(CLLocationCoordinate2D(latitude: lats[i], longitude: lngs[i]))
            }
            lastAppendedIndex = resCurrent.index

            while traveledStreak.count > streakMaxPoints {
                traveledStreak.removeFirst()
            }
        }

        // Build displayed points (streak + current target). This is bounded by streakMaxPoints.
        var displayedPoints = traveledStreak
        displayedPoints.append(targetPoint)
        let traveledLine = LineString(displayedPoints)

        // 5. Synchronized Map Updates (~60fps)
        // By perfectly syncing the red line and the dot, we eliminate the
        // visual detachment/strobing that happens at 5x speed when they update out of phase.
        if isSeeking || currentTime - lastGeoJsonUpdateTime >= geoJsonUpdateInterval {
            lastGeoJsonUpdateTime = currentTime
            
            try? mapView.mapboxMap.updateGeoJSONSource(withId: animatedSourceId, data: .feature(Feature(geometry: traveledLine)))
            try? mapView.mapboxMap.updateGeoJSONSource(withId: animatedDotSourceId, data: .feature(Feature(geometry: Point(smoothedDotPoint))))
        }

        // 6. Update completed route (monotonic, slow updates)
        maxCompletedIndex = max(maxCompletedIndex, resCurrent.index)
        if currentTime - lastCompletedUpdateTime >= completedUpdateInterval {
            lastCompletedUpdateTime = currentTime
            let completedPoints = (0...maxCompletedIndex).map { CLLocationCoordinate2D(latitude: lats[$0], longitude: lngs[$0]) }
            let completedLine = LineString(completedPoints)
            try? mapView.mapboxMap.updateGeoJSONSource(withId: completedSourceId, data: .feature(Feature(geometry: completedLine)))
        }

        // 7. Look-ahead for bearing and camera updates
        let lookDist = min(totalDistance, currentDistance + lookAheadMeters)
        interpolateCursor(at: lookDist, result: &resLookAhead)

        let targetBearing = getBearing(lat1: dotLat, lon1: dotLng, lat2: resLookAhead.lat, lon2: resLookAhead.lng)

        // Bearing calculation - immediate when seeking, smoothed during animation
        if isSeeking {
            // Snap bearing to target immediately when seeking
            camBearing = targetBearing
        } else {
            // Frame-rate independent cinematic easing for bearing
            let bearT = 1.0 - exp(-1.5 * physDt)
            var diff = targetBearing - camBearing
            if diff > 180 { diff -= 360 } else if diff < -180 { diff += 360 }
            camBearing += diff * bearT
        }

        // Camera movement - immediate when seeking, smoothed during animation
        if isSeeking {
            // Snap camera to position immediately when seeking
            camLat = dotLat
            camLng = dotLng
            camBearing = targetBearing
        } else {
            // Frame-rate independent cinematic easing for camera position
            // Dynamically scale tracking tightness based on speed multiplier
            let speedMult = speedMultipliers[speedIndex]
            let trackingSharpness = 4.0 * max(1.0, speedMult * 0.5) 
            let camT = 1.0 - exp(-trackingSharpness * physDt)
            camLat += (dotLat - camLat) * camT
            camLng += (dotLng - camLng) * camT
        }

        updateCameraIfNeeded()

        // 8. Throttled UI Update
        if currentTime - lastUIUpdateTime >= uiUpdateInterval {
            lastUIUpdateTime = currentTime
            let progress = currentDistance / totalDistance
            distanceValue.text = String(format: "%.1f", currentDistance / 1000.0)
            // Cumulative gain is O(1) now!
            elevationValue.text = String(format: "%.0f", cumulativeGain[resCurrent.index])
            progressSlider.value = Float(progress)
        }
    }

    // MARK: - UI Handlers (Existing logic)
    @objc private func handlePauseResume() {
        if isCompleted {
            currentDistance = 0
            currentIndexCursor = 0
            isCompleted = false
            // Reset completed route index for restarting
            maxCompletedIndex = 0
        } else {
            isPaused.toggle()
        }
        updatePauseResumeUI()
    }

    private func updateCameraIfNeeded() {
        let currentTime = CACurrentMediaTime()
        if currentTime - lastCameraUpdateTime < cameraUpdateInterval { return }

        let distanceMoved = haversine(lat1: lastSetCamLat, lon1: lastSetCamLng, lat2: camLat, lon2: camLng)
        let bearingDiff = abs(camBearing - lastSetCamBearing)

        if distanceMoved >= cameraMoveThreshold || bearingDiff > 0.1 {
            lastCameraUpdateTime = currentTime
            lastSetCamLat = camLat; lastSetCamLng = camLng; lastSetCamBearing = camBearing

            mapView.mapboxMap.setCamera(to: CameraOptions(
                center: CLLocationCoordinate2D(latitude: camLat, longitude: camLng),
                zoom: baseZoom,
                bearing: camBearing,
                pitch: basePitch
            ))
        }
    }

    private func updatePauseResumeUI() {
        let icon = isCompleted ? "arrow.counterclockwise" : (isPaused ? "play.fill" : "pause.fill")
        pauseResumeButton.setImage(UIImage(systemName: icon), for: .normal)
    }

    @objc private func handleSpeedToggle() {
        speedIndex = (speedIndex + 1) % speedMultipliers.count
        let mult = speedMultipliers[speedIndex]
        let title = mult.truncatingRemainder(dividingBy: 1) == 0 ? String(format: "%.0fx", mult) : String(format: "%.1fx", mult)
        speedButton.setTitle(title, for: .normal)
        
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
    }

    @objc private func handleScrubBegin() {
        isSeeking = true
        isPaused = true // Pause actively playing animation
        updatePauseResumeUI()
    }

    @objc private func handleScrubEnd() {
        isSeeking = false
        // Resume playback if it hasn't reached the end
        if !isCompleted {
            isPaused = false
            lastPhysicsTime = CACurrentMediaTime()
            updatePauseResumeUI()
        }
    }

    @objc private func handleSeek() {
        currentDistance = Double(progressSlider.value) * totalDistance
        currentIndexCursor = 0
        isCompleted = false

        // Generate the exact frame immediately
        updateVisuals()
    }

    @objc private func handleClose() {
        print("Close button tapped - notifying plugin to restore root VC")

        // Stop the animation first
        displayLink?.invalidate()
        displayLink = nil
        isAnimating = false

        // Send notification to plugin - plugin handles the actual closing
        NotificationCenter.default.post(
            name: NSNotification.Name("CloseRouteAnimation"),
            object: nil
        )
    }

    private func findWebViewController() -> UIViewController? {
        // Try to find the Capacitor web view controller
        if let window = UIApplication.shared.windows.first(where: { $0.isKeyWindow }) {
            // Check if any view controller in the hierarchy has a web view
            func hasWebView(_ vc: UIViewController) -> Bool {
                // Check if it has WKWebView or UIWebView subviews
                for subview in vc.view.subviews {
                    if subview is WKWebView || subview is UIWebView {
                        return true
                    }
                }

                // Check child view controllers
                for child in vc.children {
                    if hasWebView(child) {
                        return true
                    }
                }

                return false
            }

            // Search through all windows and their view controllers
            for window in UIApplication.shared.windows {
                if let rootVC = window.rootViewController {
                    if hasWebView(rootVC) {
                        return rootVC
                    }

                    // Check presented view controllers
                    var currentVC: UIViewController? = rootVC
                    while currentVC != nil {
                        if let presented = currentVC?.presentedViewController {
                            if hasWebView(presented) {
                                return presented
                            }
                            currentVC = presented
                        } else {
                            break
                        }
                    }
                }
            }
        }
        return nil
    }

    private func findCapacitorBridge() -> AnyObject? {
        // Try to find the Capacitor bridge
        if let window = UIApplication.shared.windows.first(where: { $0.isKeyWindow }),
           let rootVC = window.rootViewController {

            // Look through the view controller hierarchy for Capacitor bridge
            var current: UIViewController? = rootVC
            while current != nil {
                if let bridge = (current as AnyObject).value(forKey: "bridge") {
                    return bridge as AnyObject
                }
                current = current?.parent ?? current?.presentingViewController
            }
        }
        return nil
    }

    private func findNavigationController(from viewController: UIViewController? = nil) -> UINavigationController? {
        let startVC = viewController ?? self

        if let nav = startVC as? UINavigationController {
            return nav
        }

        if let nav = startVC.navigationController {
            return nav
        }

        // Search parent hierarchy
        var current = startVC.parent
        while current != nil {
            if let nav = current as? UINavigationController {
                return nav
            }
            if let nav = current?.navigationController {
                return nav
            }
            current = current?.parent
        }

        return nil
    }

    private func forceCloseAndRestoreWebView() {
        print("Force closing route animation and restoring web view")

        // Remove ourselves from view hierarchy
        willMove(toParent: nil)
        view.removeFromSuperview()
        removeFromParent()

        // Try to find and restore the web view
        if let webVC = findWebViewController(),
           let window = UIApplication.shared.windows.first(where: { $0.isKeyWindow }) {

            // Set the web view controller as root
            window.rootViewController = webVC
            window.makeKeyAndVisible()

            // Ensure web view is visible and interactive
            webVC.view.isHidden = false
            webVC.view.alpha = 1.0

            print("Restored web view controller")
        } else {
            print("Could not find web view controller to restore")
        }
    }

    @objc private func handleMapTap() {
        isControlsHidden.toggle()
        UIView.animate(withDuration: 0.4, delay: 0, usingSpringWithDamping: 0.8, initialSpringVelocity: 0, options: .curveEaseInOut) {
            self.controlsContainer.alpha = self.isControlsHidden ? 0 : 1
            self.controlsContainer.transform = self.isControlsHidden ? CGAffineTransform(translationX: 0, y: 20) : .identity
            self.closeButton.alpha = self.isControlsHidden ? 0 : 1
            self.closeButton.transform = self.isControlsHidden ? CGAffineTransform(translationX: 0, y: -10) : .identity
        }
    }

    // MARK: - Math & Optimization Helpers

    /// Optimized Interpolation: Uses a cursor to find the current segment in O(1) average time.
    private func interpolateCursor(at distance: Double, result: inout InterpolationResult) {
        let d = max(0, min(distance, totalDistance))

        // If user jumped backward (seeking), reset cursor
        if d < dists[currentIndexCursor] {
            currentIndexCursor = 0
        }

        // Move cursor forward
        while currentIndexCursor < nPoints - 1 && dists[currentIndexCursor + 1] < d {
            currentIndexCursor += 1
        }

        let i = currentIndexCursor
        if i >= nPoints - 1 {
            result.update(lat: lats[i], lng: lngs[i], ele: demEles[i], index: i)
            return
        }

        let dStart = dists[i]
        let dEnd = dists[i+1]
        let t = (d - dStart) / (dEnd - dStart)

        let lat = lats[i] + (lats[i+1] - lats[i]) * t
        let lng = lngs[i] + (lngs[i+1] - lngs[i]) * t
        let ele = demEles[i] + (demEles[i+1] - demEles[i]) * t

        result.update(lat: lat, lng: lng, ele: ele, index: i)
    }

    private func haversine(lat1: Double, lon1: Double, lat2: Double, lon2: Double) -> Double {
        let phi1 = lat1 * .pi / 180, phi2 = lat2 * .pi / 180
        let dP = (lat2-lat1) * .pi / 180, dL = (lon2-lon1) * .pi / 180
        let a = sin(dP/2)*sin(dP/2) + cos(phi1)*cos(phi2)*sin(dL/2)*sin(dL/2)
        return 6371000.0 * 2 * atan2(sqrt(a), sqrt(1-a))
    }


    private func getBearing(lat1: Double, lon1: Double, lat2: Double, lon2: Double) -> Double {
        let p1 = lat1 * .pi / 180, p2 = lat2 * .pi / 180, dL = (lon2-lon1) * .pi / 180
        let y = sin(dL) * cos(p2), x = cos(p1)*sin(p2) - sin(p1)*cos(p2)*cos(dL)
        return (atan2(y, x) * 180 / .pi + 360).truncatingRemainder(dividingBy: 360)
    }


    private func getElevationAtLatLng(lat: Double, lng: Double) -> Double {
        // Find nearest stored elevation (same as before)
        if lats.isEmpty { return 0.0 }
        var minDist = Double.greatestFiniteMagnitude
        var idx = 0
        for i in 0..<lats.count {
            let d = haversine(lat1: lat, lon1: lng, lat2: lats[i], lon2: lngs[i])
            if d < minDist {
                minDist = d
                idx = i
            }
        }
        return eles[idx]
    }

    // MARK: - Gesture Delegate
    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
        if touch.view?.isDescendant(of: controlsContainer) == true || touch.view == closeButton {
            return false
        }
        return true
    }

    private func setupGestures() {
        let tap = UITapGestureRecognizer(target: self, action: #selector(handleMapTap))
        tap.delegate = self
        view.addGestureRecognizer(tap)
    }
}
