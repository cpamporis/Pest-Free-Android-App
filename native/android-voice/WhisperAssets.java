package com.cpamporis.pestfree.voice;

import android.content.Context;
import java.io.*;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.function.BooleanSupplier;

// Model weights only. Audio never enters the filesystem.
final class WhisperAssets {
  static File model(Context context, BooleanSupplier cancelled) throws Exception {
    File dir=new File(context.getNoBackupFilesDir(),"pestify-whisper");
    if(!dir.isDirectory()&&!dir.mkdirs())throw new IOException("MODEL_DIRECTORY");
    File file=new File(dir,WhisperModel.NAME);
    if(file.isFile()&&file.length()==WhisperModel.BYTES&&digest(file,cancelled).equals(WhisperModel.SHA256))return file;
    File temp=new File(dir,WhisperModel.NAME+".part");
    try {
      try(InputStream input=context.getAssets().open("pestify-whisper/"+WhisperModel.NAME);OutputStream output=new FileOutputStream(temp)) {
        byte[] buffer=new byte[65536];int n;long count=0;
        while((n=input.read(buffer))!=-1){check(cancelled);count+=n;if(count>WhisperModel.BYTES)throw new IOException("MODEL_SIZE");output.write(buffer,0,n);}
      }
      if(temp.length()!=WhisperModel.BYTES||!digest(temp,cancelled).equals(WhisperModel.SHA256))throw new IOException("MODEL_CHECKSUM");
      check(cancelled);
      if(file.exists()&&!file.delete())throw new IOException("MODEL_REPLACE");
      if(!temp.renameTo(file))throw new IOException("MODEL_INSTALL");return file;
    } finally { temp.delete(); }
  }
  private static void check(BooleanSupplier cancelled)throws IOException {if(cancelled.getAsBoolean())throw new IOException("CANCELLED");}
  private static String digest(File file,BooleanSupplier cancelled)throws Exception {
    MessageDigest digest=MessageDigest.getInstance("SHA-256");
    try(InputStream input=new FileInputStream(file)){byte[] buffer=new byte[65536];int n;while((n=input.read(buffer))!=-1){check(cancelled);digest.update(buffer,0,n);}}
    StringBuilder hex=new StringBuilder();for(byte b:digest.digest())hex.append(String.format(Locale.ROOT,"%02x",b&255));return hex.toString();
  }
}
