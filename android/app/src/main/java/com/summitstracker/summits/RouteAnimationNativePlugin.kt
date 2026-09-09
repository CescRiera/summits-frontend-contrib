package com.summitstracker.summits

import android.Manifest
import android.content.Intent
import android.os.Build
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import org.json.JSONArray
import org.json.JSONException
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap

@CapacitorPlugin(
    name = "RouteAnimationNative",
    permissions = [
        Permission(
            alias = "storage",
            strings = [Manifest.permission.WRITE_EXTERNAL_STORAGE]
        )
    ]
)
class RouteAnimationNativePlugin : Plugin() {

    companion object {
        private const val TAG = "RouteAnimationNative"
        private const val ROUTE_ANIMATION_REQUEST_CODE = 0x1001 // Unique request code
        
        // Store PluginCall references by unique ID to avoid saving large data in bundle
        // This prevents Capacitor from trying to save the entire call with coordinates
        private val pendingCalls = ConcurrentHashMap<String, PluginCall>()
    }

    @PluginMethod
    fun startAnimation(call: PluginCall) {
        // Check storage permission for Android 9 and below (MediaStore API on Android 10+ doesn't need it)
        // On Android 10+ (API 29+), MediaStore API works without WRITE_EXTERNAL_STORAGE permission
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            // Android 9 and below need WRITE_EXTERNAL_STORAGE permission
            if (getPermissionState("storage") != com.getcapacitor.PermissionState.GRANTED) {
                requestPermissionForAlias("storage", call, "storagePermsCallback")
                return
            }
        }
        
        // Permission granted or not needed - proceed with animation
        startAnimationInternal(call)
    }
    
    @PermissionCallback
    private fun storagePermsCallback(call: PluginCall) {
        if (getPermissionState("storage") == com.getcapacitor.PermissionState.GRANTED) {
            startAnimationInternal(call)
        } else {
            call.reject("Storage permission is required to save videos to gallery")
        }
    }
    
    private fun startAnimationInternal(call: PluginCall) {
        var tempFile: File? = null
        try {
            // Get configuration from call
            val config = call.data ?: run {
                call.reject("Configuration is required")
                return
            }

            // Extract route data
            val coordinatesJson = config.getJSONArray("coordinates")
                ?: run {
                    call.reject("Coordinates are required")
                    return
                }
            
            if (coordinatesJson.length() == 0) {
                call.reject("Coordinates are required")
                return
            }

            val routeName = config.getString("routeName", "Route")
            val totalDistance = config.getDouble("totalDistance")
            val totalElevation = config.getDouble("totalElevation")
            val mapboxAccessToken = config.getString("mapboxAccessToken")

            if (mapboxAccessToken.isNullOrEmpty()) {
                call.reject("Mapbox access token is required")
                return
            }

            // Extract labels (optional, with defaults)
            val elevationLabel = config.getString("elevationLabel", "ELEVATION GAIN")
            val distanceLabel = config.getString("distanceLabel", "DISTANCE")

            // Extract optional config
            val baseSpeed = if (config.has("baseSpeed")) config.getDouble("baseSpeed") else 150.0
            val pitch = if (config.has("pitch")) config.getDouble("pitch") else 55.0
            val cameraAltitude = if (config.has("cameraAltitude")) config.getDouble("cameraAltitude") else 2500.0

            // Extract peaks (optional)
            val peaksJson = if (config.has("peaks")) config.getJSONArray("peaks") else null
            var peaksFile: File? = null
            if (peaksJson != null && peaksJson.length() > 0) {
                // Write peaks to temporary file (similar to coordinates)
                val peaksJsonString = peaksJson.toString()
                peaksFile = File(context.cacheDir, "route_peaks_${java.util.UUID.randomUUID()}.json")
                try {
                    FileOutputStream(peaksFile).use { fos ->
                        fos.write(peaksJsonString.toByteArray(Charsets.UTF_8))
                        fos.flush()
                    }
                } catch (e: IOException) {
                    Log.e(TAG, "Error writing peaks to temp file", e)
                    // Continue without peaks if file write fails
                    if (peaksFile.exists()) {
                        peaksFile.delete()
                    }
                    peaksFile = null
                }
            }

            // Write coordinates to temporary file to avoid Intent bundle size limits
            // Android has a ~1MB limit on Intent extras, and large coordinate arrays can exceed this
            val coordinatesJsonString = coordinatesJson.toString()
            tempFile = File(context.cacheDir, "route_coords_${java.util.UUID.randomUUID()}.json")
            
            try {
                FileOutputStream(tempFile).use { fos ->
                    fos.write(coordinatesJsonString.toByteArray(Charsets.UTF_8))
                    fos.flush()
                }
            } catch (e: IOException) {
                Log.e(TAG, "Error writing coordinates to temp file", e)
                call.reject("Failed to prepare route data: ${e.message}")
                return
            }

            // Create Intent to start RouteAnimationActivity
            val intent = Intent(activity, RouteAnimationActivity::class.java)
            
            // Pass file path instead of coordinates string to avoid bundle size issues
            intent.putExtra("coordinatesFile", tempFile.absolutePath)
            peaksFile?.let {
                intent.putExtra("peaksFile", it.absolutePath)
            }
            intent.putExtra("routeName", routeName)
            intent.putExtra("totalDistance", totalDistance)
            intent.putExtra("totalElevation", totalElevation)
            intent.putExtra("mapboxAccessToken", mapboxAccessToken)
            intent.putExtra("baseSpeed", baseSpeed)
            intent.putExtra("pitch", pitch)
            intent.putExtra("cameraAltitude", cameraAltitude)

            // Pass labels
            intent.putExtra("elevationLabel", elevationLabel)
            intent.putExtra("distanceLabel", distanceLabel)

            // Store call reference by unique ID to avoid saving large data in bundle
            // This prevents Capacitor from trying to serialize the entire call with coordinates
            val callId = java.util.UUID.randomUUID().toString()
            pendingCalls[callId] = call
            intent.putExtra("callId", callId)

            // Start Activity for result - but we'll handle the result manually
            // to avoid Capacitor saving the large call data
            // We use the activity directly instead of Capacitor's startActivityForResult
            // to prevent it from saving the call with large coordinates data
            activity.startActivityForResult(intent, ROUTE_ANIMATION_REQUEST_CODE)

        } catch (e: JSONException) {
            Log.e(TAG, "Error parsing configuration", e)
            tempFile?.takeIf { it.exists() }?.delete()
            call.reject("Invalid configuration: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Error starting animation", e)
            tempFile?.takeIf { it.exists() }?.delete()
            call.reject("Failed to start animation: ${e.message}")
        }
    }

    override fun handleOnActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != ROUTE_ANIMATION_REQUEST_CODE) {
            super.handleOnActivityResult(requestCode, resultCode, data)
            return
        }
        
        // Retrieve call from our static map using the ID
        val callId = data?.getStringExtra("callId")
        
        // If no callId in data, try to find any pending call (fallback)
        val call = if (callId != null) {
            pendingCalls.remove(callId)
        } else if (pendingCalls.isNotEmpty()) {
            // Fallback: remove first pending call if no callId provided
            val firstCall = pendingCalls.values.first()
            pendingCalls.clear()
            Log.w(TAG, "No callId in result, using fallback call resolution")
            firstCall
        } else {
            null
        }
        
        if (call == null) {
            Log.e(TAG, "Call not found for ID: $callId")
            return
        }

        // Clean up temp coordinates and peaks files
        data?.let { d ->
            d.getStringExtra("coordinatesFile")?.let { coordinatesFilePath ->
                val tempFile = File(coordinatesFilePath)
                if (tempFile.exists()) {
                    val deleted = tempFile.delete()
                    if (!deleted) {
                        Log.w(TAG, "Failed to delete temp coordinates file: $coordinatesFilePath")
                    }
                }
            }
            d.getStringExtra("peaksFile")?.let { peaksFilePath ->
                val peaksFile = File(peaksFilePath)
                if (peaksFile.exists()) {
                    val deleted = peaksFile.delete()
                    if (!deleted) {
                        Log.w(TAG, "Failed to delete temp peaks file: $peaksFilePath")
                    }
                }
            }
        }

        when (resultCode) {
            android.app.Activity.RESULT_OK -> {
                // Animation completed successfully (no longer recording videos)
                val ret = JSObject()
                ret.put("success", true)
                call.resolve(ret)
            }
            android.app.Activity.RESULT_CANCELED -> {
                val error = data?.getStringExtra("error")
                call.reject(error ?: "Animation was cancelled")
            }
            else -> {
                // Handle case where resultCode is not OK or CANCELED
                val error = data?.getStringExtra("error")
                call.reject(error ?: "Animation failed with unknown error")
            }
        }
    }
}



