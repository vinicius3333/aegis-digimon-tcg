# Opera tablet audio compatibility

An Android tablet running Opera was reported to replace game audio with a prolonged beep. The existing native-rate Web Audio buffering and source disconnection changes do not avoid Opera's Web Audio output path. The actual tablet and its browser version are unavailable, so the device-specific root cause and audible resolution remain unverified.

Use native HTML audio playback on Android Opera. This avoids the AudioContext output and compressor altogether. Changing latency hints again would keep the suspect output path; disabling sound would discard working audio. Other browsers, including Opera on iOS and desktop, retain their existing prepared-buffer mixer.

Prepare finite PCM16 WAV clips by copying each authored cue's exact frames from the existing bank into local Blob URLs. Each clip ends at its own EOF, without JavaScript timers or seeking within the complete bank. Reuse a bounded pool of eight media players, coalesce identical cues within 75 ms, and apply the existing independently persisted music/effects controls. The existing mix gains keep the bounded native mix below full scale.

Start playback only after user input; handle rejected playback without replaying stale cues. Pause music and effects when hidden, restore wanted music when visible, and release media sources and Blob URLs on teardown. Late preparation cannot revive disposed playback.

Verify browser selection, exact PCM frames and durations for all shipped cues, overlap limits, channel controls, denied playback, hidden-page cleanup, and teardown. A Chromium browser test with an Android Opera user agent checks actual native decoding, music progress, cue EOF, and zero AudioContext allocation. This validates the compatibility implementation, not the physical tablet's audio driver.
