package com.cpamporis.pestfree.voice;
import java.util.Arrays;
public final class VoiceEndpointTest {
  static short[] frame(int value){short[] s=new short[1600];Arrays.fill(s,(short)value);return s;}
  static void check(boolean ok){if(!ok)throw new AssertionError();}
  public static void main(String[] args){
    short[] silent=frame(0),speech=frame(3000),quiet=frame(70);
    VoiceEndpoint idle=new VoiceEndpoint(16000,900,10000);
    for(int i=0;i<1200;i++)check(!idle.accept(quiet,1600));
    check(!idle.started()&&!idle.usable());
    VoiceEndpoint utterance=new VoiceEndpoint(16000,900,10000);
    check(!utterance.accept(speech,1600));check(utterance.started());
    check(!utterance.accept(speech,1600));check(utterance.usable());
    for(int i=0;i<8;i++)check(!utterance.accept(silent,1600));
    check(utterance.accept(silent,1600));
    VoiceEndpoint pause=new VoiceEndpoint(16000,900,10000);
    pause.accept(speech,1600);pause.accept(speech,1600);
    for(int i=0;i<6;i++)check(!pause.accept(silent,1600));
    check(!pause.accept(speech,1600));
    for(int i=0;i<8;i++)check(!pause.accept(silent,1600));
    check(pause.accept(silent,1600));
    VoiceEndpoint click=new VoiceEndpoint(16000,900,10000);
    click.accept(speech,1600);for(int i=0;i<9;i++)click.accept(silent,1600);check(!click.usable());
    VoiceEndpoint bound=new VoiceEndpoint(16000,900,10000);
    for(int i=0;i<99;i++)check(!bound.accept(speech,1600));check(bound.accept(speech,1600));check(bound.limited());check(!utterance.limited());
    System.out.println("PASS: silence, phrase endpoint, short pause, click rejection and capture bound");
  }
}
