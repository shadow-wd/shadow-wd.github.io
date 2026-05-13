---
date: 2026-04-25
publish: true
published_at: 2026-05-13
title: PulseAudio
categories:
  - Linux
tags:
  - PulseAudio
---
# 前言




官方网站：
https://www.freedesktop.org/wiki/Software/PulseAudio/

源码：
https://gitlab.freedesktop.org/pulseaudio/pulseaudio



# 音频框架
本文参照的是高通平台pa的架构。

应用层        paplay / app
                  ↓
PA 层         PulseAudio Daemon
                  ↓
高通抽象层    QAL (Qualcomm Audio Layer)   ← 这里
                  ↓
图管理层      AGM (Audio Graph Manager)
                  ↓
内核层        ALSA Driver
                  ↓
硬件          Codec / DSP


apps_proc/src/external/pulseaudio/src/modules/qal/module-qal-card/qal-sink.c

QAL (Qualcomm Audio Layer):
管理 stream（音频流的打开、读写、关闭）
管理 session（一次录音/播放会话）
决定走哪个 audio graph（音频图）


AGM (Audio Graph Manager)有两种方式：
libagm.so
agm service
```
/usr/lib # find / -name "*mixer_plugin*" -o -name "*agm_mixer*" 2>/dev/null | grep -v proc
/usr/lib/libagm_mixer_plugin.so
```


# 音频输出/输入
### 查询基本信息

```
pactl info
```

## sink
### 查看所有sink

(可以去掉short参数，显示每个sink的详细参数，其中包括每个sink设置的音量)
```
/ # pactl list sinks short
1       low-latency0    module-qal-card.c       s16le 2ch 48000Hz       SUSPENDED
2       deep-buffer0    module-qal-card.c       s16le 2ch 48000Hz       SUSPENDED
3       offload0        module-qal-card.c       s16le 2ch 48000Hz       SUSPENDED
```

低延迟场景  →  low-latency0   (实时音效、提示音)
长音频场景  →  deep-buffer0   (音乐播放，省电)
DSP卸载场景 →  offload0       (硬件解码，CPU占用极低)

### 查看默认sink

```
pactl get-default-sink
```
或者播放音量的时候查看哪个sink被使用了。
```
pactl list sink-inputs short
```




## 音量控制
### 设置音量

primary是sinks的名字，根据播放音频的时候使用的具体sinks名字调整。

```
pactl set-sink-volume primary 5%
```

但是在嵌入式中有可能这样设置并不能改变音量。
```
/ # pactl list sinks | grep -A 40 "low-latency0" | grep -E "Flags|Volume"
        Volume: front-left: 6553 /  10%,   front-right: 6553 /  10%
        Base Volume: 65536 / 100%
        Flags: HARDWARE HW_VOLUME_CTRL LATENCY
        Volume: front-left: 65536 / 100%,   front-right: 65536 / 100%
        Base Volume: 65536 / 100%
        Flags: HARDWARE HW_VOLUME_CTRL LATENCY
```

HW_VOLUME_CTRL表示有其他的在控制音量，pa会把音量控制交给这里，而不是pcm直接处理。所以上面的方法设置音量不会生效。







### 获取当前音量
```
pactl get-sink-volume primary
```






## 输出

查音频输出源

````
pactl list sinks
````

如果不知道具体用的是哪一个，可以使音频处于工作状态然后再用命令查看状态。

### 查询sink信息
```
pactl list sinks
```



## 输入
查音频输入源

```
pactl list sources
```

# module



## module-alsa-sink




### 流程

可以看到标准的音频流可以任何时候调节音量，就是因为把这个写入到文件中了。无论 stream 开着还是关着，mixer 寄存器都在

apps_proc/src/external/pulseaudio/src/modules/alsa/module-alsa-sink.c
```
pactl set-sink-volume
        ↓
PA sink.c 收到请求
        ↓
module-alsa-sink.c 的 set_volume_cb
        ↓
写入 ALSA mixer control（独立于stream存在）
        ↓
mixer control 值永久保存在硬件寄存器里
```


### 设计思路

也就是pa的插件同时设计打开两条流，不同的是数据流有音频时候就打开，控制流是在音量改变的时候
标准的alsa是走的两个接口，一个走控制，一个走数据流
但是高通这个就不管控制流了，直走数据流，音量调节直接绑定数据流的stream去调节


```
/dev/snd/pcmC0D0p    ← 音频数据流（PCM数据）
/dev/snd/controlC0   ← 控制流（音量/路由/开关）
```

```
pcmC0D0p:
    没有播放  →  关闭
    播放中    →  打开
    播放结束  →  关闭

controlC0:
    系统启动  →  打开
    调音量    →  读写
    系统关闭  →  关闭

→ controlC0 始终存在，和播放状态无关
→ 所以随时可以调音量
```



### 音量控制

每次设置音量之前都会先获取mix中音量
```
        pa_sink_set_get_volume_callback(u->sink, sink_get_volume_cb);
        pa_sink_set_set_volume_callback(u->sink, sink_set_volume_cb);
```




可以看到这里去检查mixer中的参数
```
static void sink_set_volume_cb(pa_sink *s) {
......
    pa_assert(u->mixer_path);
    pa_assert(u->mixer_handle);
```



## qal-sink
apps_proc/src/external/pulseaudio/src/modules/qal/module-qal-card/qal-sink.c


### 流程
高通qal-sink流程
```
pactl set-sink-volume
        ↓
PA sink.c 收到请求
        ↓
qal-sink.c 的 set_volume_cb
        ↓
调用 qal_stream_set_volume(u->qal_stream)
        ↓
qal_stream 不存在？→ 直接报错返回
```

### 设计思路
高通这样设计可以很明显看出来音量控制是绑定在stream上的，也就是说没有音频流就无法设置音量

可能是这个下面多个设备接口，只有一个control，没法控制。

```
/dev/snd # ls
by-path    controlC0  pcmC0D0c   pcmC0D10c  pcmC0D11c  pcmC0D12c  pcmC0D13c  pcmC0D1p   pcmC0D2p   pcmC0D3c   pcmC0D4c   pcmC0D5p   pcmC0D6p   pcmC0D7p   pcmC0D8p   pcmC0D9c   timer
```

### 生命周期

连接client

```
Client authenticated anonymously.
```


sink 从 SUSPENDED 唤醒
```
qal-sink.c: opening sink with configuration type=0x1, format=1, sample_rate=48000, channels=2
qal-sink.c: pal sink opened 0x7f78000e60
```


采样配置
```
rate 44100 -> 48000 (method speex-float-1)
channels 1 -> 2 (resampling 1)
```


音频流创建并播放（RUNNING也就是这个时候音量才可以被调节）
```
sink.c: low-latency0: state: IDLE -> RUNNING
Created input 1 "/data/test.wav" on low-latency0
Final latency 2005.33 ms
```

播放结束,销毁stream
```
Freeing input 1 "/data/test.wav"
```


sink 重新进入 SUSPENDED(空闲超过1s进入SUSPENDED)
```
qal-sink.c: closing pal sink 0x7f78000e60   ← qal_stream 被销毁
sink.c: low-latency0: state: IDLE -> SUSPENDED
```



# log
查看日志

```
journalctl -u pulseaudio -f
```


提高log等级
5是debug级
PULSE_LOG=5 paplay data/test.wav
