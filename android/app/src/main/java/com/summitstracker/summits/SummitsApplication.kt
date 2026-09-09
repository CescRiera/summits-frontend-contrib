package com.summitstracker.summits

import android.app.Application
import android.util.Log

class SummitsApplication : Application() {
    companion object {
        private const val TAG = "SummitsApplication"
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "SummitsApplication onCreate")
    }
}



