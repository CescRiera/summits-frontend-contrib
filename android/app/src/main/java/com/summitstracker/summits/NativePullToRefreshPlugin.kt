package com.summitstracker.summits

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "NativePullToRefresh")
class NativePullToRefreshPlugin : Plugin() {

    @PluginMethod
    fun setEnabled(call: PluginCall) {
        val enabled = call.getBoolean("enabled") ?: false
        (activity as? MainActivity)?.setNativePullToRefreshEnabled(enabled)
        call.resolve()
    }

    @PluginMethod
    fun complete(call: PluginCall) {
        (activity as? MainActivity)?.completeNativePullToRefresh()
        call.resolve()
    }
}
