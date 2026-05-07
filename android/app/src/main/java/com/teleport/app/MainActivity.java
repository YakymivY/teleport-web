package com.teleport.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.capacitorjs.plugins.filesystem.FilesystemPlugin;
import com.capacitorjs.plugins.filetransfer.FileTransferPlugin;
import com.capacitorjs.plugins.share.SharePlugin;
import com.getcapacitor.community.media.MediaPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FilesystemPlugin.class);
        registerPlugin(FileTransferPlugin.class);
        registerPlugin(SharePlugin.class);
        registerPlugin(MediaPlugin.class);
        registerPlugin(MediaScanPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
