package com.teleport.app;

import android.media.MediaScannerConnection;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MediaScan")
public class MediaScanPlugin extends Plugin {
    @PluginMethod
    public void scanFile(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("Path is required");
            return;
        }
        if (path.startsWith("file://")) {
            path = path.substring(7);
        }
        final String finalPath = path;
        MediaScannerConnection.scanFile(
            getContext(),
            new String[]{ finalPath },
            null,
            (scannedPath, uri) -> call.resolve()
        );
    }
}
