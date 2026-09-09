//
//  MyViewController.swift
//  App
//
//  Created by Marta Amatriain Vives on 9/1/26.
//

import UIKit
import Capacitor
import FirebaseAuth

// Minimal FirebaseAuthNativePlugin implementation
@objc(FirebaseAuthNativePlugin)
public class FirebaseAuthNativePlugin: CAPPlugin, CAPBridgedPlugin {

    override public func load() {
        print("[FirebaseAuthNative] 🚀 Plugin loaded")
        print("[FirebaseAuthNative] 🔧 Firebase Auth initialized: \(Auth.auth().app?.name ?? "unknown")")
        print("[FirebaseAuthNative] 👤 Current user on load: \(Auth.auth().currentUser?.uid ?? "nil")")
    }
    public let identifier = "FirebaseAuthNativePlugin"
    public let jsName = "FirebaseAuthNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signInWithEmail", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signOut", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentUser", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getIdToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signInWithCustomToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refreshTokenOnAppLaunch", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addAuthStateListener", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeAuthStateListener", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restoreAuthSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearNotificationBadges", returnType: CAPPluginReturnPromise)
    ]

    @objc func getCurrentUser(_ call: CAPPluginCall) {
        print("[FirebaseAuthNative] 🔍 getCurrentUser called")
        print("[FirebaseAuthNative] 🔍 Firebase Auth current user: \(Auth.auth().currentUser?.uid ?? "nil")")

        guard let user = Auth.auth().currentUser else {
            print("[FirebaseAuthNative] ❌ No current user found")
            call.resolve(["user": NSNull()])
            return
        }

        print("[FirebaseAuthNative] ✅ Found current user: \(user.uid)")
        call.resolve([
            "user": [
                "uid": user.uid,
                "email": user.email ?? NSNull(),
                "emailVerified": user.isEmailVerified
            ]
        ])
    }

    @objc func getIdToken(_ call: CAPPluginCall) {
        guard let user = Auth.auth().currentUser else {
            call.reject("No user is currently signed in")
            return
        }
        let forceRefresh = call.getBool("forceRefresh") ?? false

        Task {
            do {
                let tokenResult = try await user.getIDTokenResult(forcingRefresh: forceRefresh)
                call.resolve(["token": tokenResult.token])
            } catch {
                call.reject("Failed to get ID token: \(error.localizedDescription)")
            }
        }
    }

    @objc func signInWithEmail(_ call: CAPPluginCall) {
        guard let email = call.getString("email"),
              let password = call.getString("password") else {
            call.reject("Email and password are required")
            return
        }

        Task {
            do {
                let result = try await Auth.auth().signIn(withEmail: email, password: password)
                let user = result.user
                call.resolve([
                    "user": [
                        "uid": user.uid,
                        "email": user.email ?? NSNull(),
                        "emailVerified": user.isEmailVerified
                    ]
                ])
            } catch {
                call.reject("Failed to sign in: \(error.localizedDescription)")
            }
        }
    }

    @objc func signInWithCustomToken(_ call: CAPPluginCall) {
        guard let customToken = call.getString("token") else {
            call.reject("Custom token is required")
            return
        }

        Task {
            do {
                let result = try await Auth.auth().signIn(withCustomToken: customToken)
                let user = result.user
                call.resolve([
                    "user": [
                        "uid": user.uid,
                        "email": user.email ?? NSNull(),
                        "emailVerified": user.isEmailVerified
                    ]
                ])
            } catch {
                call.reject("Failed to sign in with custom token: \(error.localizedDescription)")
            }
        }
    }

    @objc func signOut(_ call: CAPPluginCall) {
        do {
            try Auth.auth().signOut()
            call.resolve()
        } catch {
            call.reject("Failed to sign out: \(error.localizedDescription)")
        }
    }

    @objc func addAuthStateListener(_ call: CAPPluginCall) {
        print("[FirebaseAuthNative] 👂 addAuthStateListener called")

        // Generate a unique listener ID
        let listenerId = UUID().uuidString
        print("[FirebaseAuthNative] 👂 Generated listener ID: \(listenerId)")

        // Set up the actual Firebase auth state listener
        let handle = Auth.auth().addStateDidChangeListener { (auth, user) in
            print("[FirebaseAuthNative] 🔄 Auth state changed - User: \(user?.uid ?? "nil")")

            // Send event to JavaScript
            var data: [String: Any] = ["user": NSNull()]
            if let user = user {
                data["user"] = [
                    "uid": user.uid,
                    "email": user.email ?? NSNull(),
                    "emailVerified": user.isEmailVerified
                ]
            }
            self.notifyListeners("authStateChanged", data: data)
        }

        // Store the listener handle if needed for cleanup
        // Note: In a real implementation, you'd want to manage listener cleanup

        call.resolve(["listenerId": listenerId])
        print("[FirebaseAuthNative] 👂 Auth state listener set up successfully")
    }

    @objc func removeAuthStateListener(_ call: CAPPluginCall) {
        guard let _ = call.getString("listenerId") else {
            call.reject("listenerId is required")
            return
        }
        // Note: Simplified implementation - would need proper listener management
        call.resolve()
    }

    @objc func refreshTokenOnAppLaunch(_ call: CAPPluginCall) {
        print("[FirebaseAuthNative] 🔄 refreshTokenOnAppLaunch called")

        guard let user = Auth.auth().currentUser else {
            print("[FirebaseAuthNative] ❌ No current user for refresh - Firebase Auth has no session")
            call.reject("No user is currently signed in")
            return
        }

        print("[FirebaseAuthNative] 🔄 Refreshing token for user: \(user.uid)")

        Task {
            do {
                print("[FirebaseAuthNative] 🔄 Getting previous token...")
                // Get current token (previous token)
                let previousTokenResult = try await user.getIDTokenResult(forcingRefresh: false)
                print("[FirebaseAuthNative] 🔄 App Launch Token Refresh - Previous Token: \(previousTokenResult.token.prefix(50))...")

                print("[FirebaseAuthNative] 🔄 Forcing token refresh...")
                // Force refresh to get new token
                let newTokenResult = try await user.getIDTokenResult(forcingRefresh: true)
                print("[FirebaseAuthNative] 🔄 App Launch Token Refresh - New Token: \(newTokenResult.token.prefix(50))...")
                print("[FirebaseAuthNative] 🔄 App Launch Token Refresh - Token successfully refreshed on app launch")

                print("[FirebaseAuthNative] 🔄 Resolving with new token")
                call.resolve(["token": newTokenResult.token])
            } catch {
                print("[FirebaseAuthNative] ❌ App Launch Token Refresh Failed: \(error.localizedDescription)")
                print("[FirebaseAuthNative] ❌ Error details: \(error)")
                call.reject("Failed to refresh token on app launch: \(error.localizedDescription)")
            }
        }
    }

    @objc func restoreAuthSession(_ call: CAPPluginCall) {
        print("[FirebaseAuthNative] 🔄 restoreAuthSession called")

        // This method is a placeholder for session restoration
        // In Firebase iOS SDK, sessions are automatically persisted
        // If there's no current user, it means the user was never signed in on iOS
        // or the session was cleared

        print("[FirebaseAuthNative] ❌ Cannot restore session - Firebase Auth iOS has no persisted session")
        print("[FirebaseAuthNative] 💡 The user needs to sign in again using Firebase Auth native SDK")

        call.reject("Cannot restore Firebase Auth session - user must sign in again")
    }

    @objc func clearNotificationBadges(_ call: CAPPluginCall) {
        // Clear the app icon badge number
        DispatchQueue.main.async {
            UIApplication.shared.applicationIconBadgeNumber = 0
        }
        call.resolve()
    }
}

@objc(NativePullToRefreshPlugin)
public class NativePullToRefreshPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativePullToRefreshPlugin"
    public let jsName = "NativePullToRefresh"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "complete", returnType: CAPPluginReturnPromise)
    ]

    @objc func setEnabled(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled") ?? false
        (bridge?.viewController as? MyViewController)?.setNativePullToRefreshEnabled(enabled)
        call.resolve()
    }

    @objc func complete(_ call: CAPPluginCall) {
        (bridge?.viewController as? MyViewController)?.completeNativePullToRefresh()
        call.resolve()
    }
}

class MyViewController: CAPBridgeViewController {
    private let nativePullToRefreshControl = UIRefreshControl()
    private var isNativePullToRefreshEnabled = false
    private var originalAlwaysBounceVertical: Bool?
    private var originalBounces: Bool?

    override open func capacitorDidLoad() {
        setupNativePullToRefresh()
        bridge?.registerPluginInstance(EchoPlugin())
        bridge?.registerPluginInstance(RouteAnimationNativePlugin())
        bridge?.registerPluginInstance(FirebaseAuthNativePlugin())
        bridge?.registerPluginInstance(NativePullToRefreshPlugin())
    }

    func setNativePullToRefreshEnabled(_ enabled: Bool) {
        DispatchQueue.main.async {
            self.isNativePullToRefreshEnabled = enabled

            guard let webView = self.webView else {
                return
            }

            if enabled {
                if webView.scrollView.refreshControl !== self.nativePullToRefreshControl {
                    webView.scrollView.refreshControl = self.nativePullToRefreshControl
                }
                // UIRefreshControl requires both bounces AND alwaysBounceVertical to be true.
                // Capacitor sets scrollView.bounces = false by default, which completely
                // prevents the pull-down gesture from triggering the refresh control.
                webView.scrollView.bounces = true
                webView.scrollView.alwaysBounceVertical = true
            } else {
                self.completeNativePullToRefresh()
                webView.scrollView.refreshControl = nil
                if let originalBounces = self.originalBounces {
                    webView.scrollView.bounces = originalBounces
                }
                if let originalAlwaysBounceVertical = self.originalAlwaysBounceVertical {
                    webView.scrollView.alwaysBounceVertical = originalAlwaysBounceVertical
                }
            }
        }
    }

    func completeNativePullToRefresh() {
        DispatchQueue.main.async {
            if self.nativePullToRefreshControl.isRefreshing {
                self.nativePullToRefreshControl.endRefreshing()
            }
        }
    }

    private func setupNativePullToRefresh() {
        guard let webView = webView else {
            return
        }

        // --- CUSTOMIZATION ---
        // 1. Change the spinner color (e.g., to system gray, primary app color, etc.)
        nativePullToRefreshControl.tintColor = UIColor.systemGray
        
        // 2. Add custom text below the spinner (optional)
        // Uncomment the lines below to show text, modify colors/fonts as needed.
        // let titleAttributes: [NSAttributedString.Key: Any] = [
        //     .foregroundColor: UIColor.systemGray,
        //     .font: UIFont.systemFont(ofSize: 12, weight: .medium)
        // ]
        // nativePullToRefreshControl.attributedTitle = NSAttributedString(string: "Refreshing...", attributes: titleAttributes)
        // --- END CUSTOMIZATION ---

        originalBounces = webView.scrollView.bounces
        originalAlwaysBounceVertical = webView.scrollView.alwaysBounceVertical
        nativePullToRefreshControl.addTarget(
            self,
            action: #selector(handleNativePullToRefresh),
            for: .valueChanged
        )
        setNativePullToRefreshEnabled(false)
    }

    @objc private func handleNativePullToRefresh() {
        guard isNativePullToRefreshEnabled else {
            completeNativePullToRefresh()
            return
        }

        // Defer triggering the refresh until the user actually releases their finger
        checkIfDragEndedAndTrigger()
    }

    private func checkIfDragEndedAndTrigger() {
        guard let scrollView = webView?.scrollView else { return }

        if scrollView.isDragging {
            // User is still holding down the drag. 
            // Wait 50ms and check again.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
                self?.checkIfDragEndedAndTrigger()
            }
        } else {
            // User has released the drag, trigger the actual refresh logic in JS
            bridge?.triggerWindowJSEvent(eventName: "native-pull-to-refresh")
        }
    }
}

