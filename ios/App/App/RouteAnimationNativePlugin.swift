//
//  RouteAnimationNativePlugin.swift
//  App
//

import Capacitor
import UIKit

@objc(RouteAnimationNativePlugin)
public class RouteAnimationNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RouteAnimationNativePlugin"
    public let jsName = "RouteAnimationNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startAnimation", returnType: CAPPluginReturnPromise)
    ]

    // Strong reference to prevent deallocation
    private var animationViewController: RouteAnimationViewController?

    override public func load() {
        super.load()
        NotificationCenter.default.addObserver(self, selector: #selector(closeRouteAnimation), name: NSNotification.Name("CloseRouteAnimation"), object: nil)
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func closeRouteAnimation() {
        DispatchQueue.main.async {
            self.bridge?.viewController?.dismiss(animated: true, completion: nil)
            self.animationViewController = nil
        }
    }

    @objc func startAnimation(_ call: CAPPluginCall) {
        print("🚀 [DEBUG] startAnimation called with options: \(call.options)")

        // 1. Resolve Data
        var coordinatesData: String?

        // Try new array format first (optimized)
        if let coordinatesArray = call.getArray("coordinates") {
            if let jsonData = try? JSONSerialization.data(withJSONObject: coordinatesArray, options: []),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                coordinatesData = jsonString
                print("📊 [DEBUG] Coordinates array converted to JSON string, length: \(jsonString.count)")
            }
        }
        // Fallback to old string format for backward compatibility
        else if let directData = call.getString("coordinatesData") {
            coordinatesData = directData
            print("📊 [DEBUG] Using legacy coordinatesData string, length: \(directData.count)")
        }
        // Fallback to file-based approach
        else if let filePath = call.getString("coordinatesFile") {
            coordinatesData = readFile(at: filePath)
            print("📊 [DEBUG] Coordinates loaded from file: \(filePath)")
        }

        guard let finalCoordsData = coordinatesData else {
            print("❌ [DEBUG] Missing coordinates data")
            call.reject("Missing coordinates array, coordinatesData string, or valid coordinatesFile")
            return
        }

        // 2. Resolve Peaks (Optional)
        var peaksData: String?

        // Try new array format first (optimized)
        if let peaksArray = call.getArray("peaks") {
            if let jsonData = try? JSONSerialization.data(withJSONObject: peaksArray, options: []),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                peaksData = jsonString
                print("🏔️ [DEBUG] Peaks array converted to JSON string, length: \(jsonString.count)")
            }
        }
        // Fallback to old string format for backward compatibility
        else if let directPeaks = call.getString("peaksData") {
            peaksData = directPeaks
            print("🏔️ [DEBUG] Using legacy peaksData string, length: \(directPeaks.count)")
        }
        // Fallback to file-based approach
        else if let peaksPath = call.getString("peaksFile") {
            peaksData = readFile(at: peaksPath)
            print("🏔️ [DEBUG] Peaks loaded from file: \(peaksPath)")
        }

        // 3. Get additional parameters like Android version
        let baseSpeed = call.getDouble("baseSpeed") ?? 150.0
        let pitch = call.getDouble("pitch") ?? 55.0
        let routeName = call.getString("routeName") ?? "Route"
        let totalDistance = call.getDouble("totalDistance") ?? 0.0
        let totalElevation = call.getDouble("totalElevation") ?? 0.0

        print("⚙️ [DEBUG] Animation parameters: baseSpeed=\(baseSpeed), pitch=\(pitch), routeName=\(routeName), totalDistance=\(totalDistance), totalElevation=\(totalElevation)")

        // 4. Launch UI
        DispatchQueue.main.async {
            let vc = RouteAnimationViewController()
            vc.coordinatesData = finalCoordsData
            vc.peaksData = peaksData
            vc.baseSpeed = baseSpeed
            vc.routeName = routeName
            vc.totalDistanceExpected = totalDistance
            vc.totalElevation = totalElevation

            print("🎬 [DEBUG] ViewController configured, presenting...")
            self.animationViewController = vc
            self.presentViewController(vc)
        }

        call.resolve()
    }

    // MARK: - Presentation Logic
    private func presentViewController(_ vc: UIViewController) {
        vc.modalPresentationStyle = .overFullScreen
        self.bridge?.viewController?.present(vc, animated: true, completion: nil)
    }

    // MARK: - Helpers
    private func getWindow() -> UIWindow? {
        return UIApplication.shared.windows.first(where: { $0.isKeyWindow }) ?? UIApplication.shared.windows.first
    }
    
    private func readFile(at path: String) -> String? {
        let fileURL: URL
        if path.hasPrefix("file://"), let url = URL(string: path) {
            fileURL = url
        } else {
            let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
            fileURL = cacheDir.appendingPathComponent(path)
        }
        
        do {
            let rawData = try String(contentsOf: fileURL, encoding: .utf8)
            
            if rawData.trimmingCharacters(in: .whitespacesAndNewlines).hasPrefix("[") {
                return rawData
            }
            
            if let decodedData = Data(base64Encoded: rawData),
               let decodedString = String(data: decodedData, encoding: .utf8) {
                return decodedString
            }
            
            return rawData
        } catch {
            print("❌ File read error: \(error)")
            return nil
        }
    }
}