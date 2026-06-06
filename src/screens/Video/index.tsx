import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors }     from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useT }       from '../../i18n';
import { useAppStore, VideoItem } from '../../store/useAppStore';

const FILTERS = ['filterAll','filterKaman','filterSinger','filterTar','filterGarmon','filterZerb','filterBalaban','filterPiano'] as const;
const PROGRESS_BAR_WIDTH = Dimensions.get('window').width - 40; // padding 20 each side

// ── Video Player ──────────────────────────────────────────
function VideoPlayer({ video, visible, onClose }: {
  video: VideoItem | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { t, } = useT();
  const { showToast, sendInvite, invitedMusicianIds, cancelInvite } = useAppStore();

  const [playing,    setPlaying]    = useState(false);
  const [currentSec, setCurrentSec] = useState(0);

  const progress    = useRef(new Animated.Value(0)).current;
  const progressRem = useRef(new Animated.Value(1)).current;
  const waveAnims   = useRef(Array.from({ length: 10 }, () => new Animated.Value(0.3))).current;
  const animRef       = useRef<Animated.CompositeAnimation | null>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentSecRef = useRef(0);
  const barWidthRef   = useRef(PROGRESS_BAR_WIDTH); // real width set by onLayout

  const parseDuration = (d: string) => {
    const [m, s] = d.split(':').map(Number);
    return (m ?? 0) * 60 + (s ?? 0);
  };
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const totalSec = video ? parseDuration(video.duration) : 0;
  const musicianId = video?.uid ?? video?.id ?? '';
  const invited = invitedMusicianIds.has(musicianId);

  // Sync ref with state for seek
  useEffect(() => { currentSecRef.current = currentSec; }, [currentSec]);

  // Reset on close
  useEffect(() => {
    if (!visible) {
      setPlaying(false);
      setCurrentSec(0);
      currentSecRef.current = 0;
      progress.setValue(0);
      progressRem.setValue(1);
    }
  }, [visible]);

  // Play/pause with wave animation + timer
  useEffect(() => {
    if (playing && totalSec > 0) {
      animRef.current = Animated.loop(
        Animated.stagger(80, waveAnims.map(w =>
          Animated.sequence([
            Animated.timing(w, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(w, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          ])
        ))
      );
      animRef.current.start();
      timerRef.current = setInterval(() => {
        setCurrentSec(prev => {
          const next = prev + 1;
          if (next >= totalSec) {
            setPlaying(false);
            progress.setValue(0);
            progressRem.setValue(1);
            return 0;
          }
          const ratio = next / totalSec;
          progress.setValue(ratio);
          progressRem.setValue(1 - ratio);
          return next;
        });
      }, 1000);
    } else {
      animRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      animRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, totalSec]);

  // ── Seek: drag progress bar ───────────────────────────
  const seekTo = useCallback((ratio: number) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    const newSec  = Math.floor(clamped * totalSec);
    setCurrentSec(newSec);
    currentSecRef.current = newSec;
    progress.setValue(clamped);
    progressRem.setValue(1 - clamped);
  }, [totalSec, progress, progressRem]);

  // FIX: use raw responder handlers directly — no PanResponder wrapper conflict
  const sliderHandlers = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder:  () => true,
    onResponderGrant: (e: any) => {
      const w = barWidthRef.current || PROGRESS_BAR_WIDTH;
      seekTo(e.nativeEvent.locationX / w);
    },
    onResponderMove: (e: any) => {
      const w = barWidthRef.current || PROGRESS_BAR_WIDTH;
      seekTo(e.nativeEvent.locationX / w);
    },
  };

  // ── Dəvət Et — stays in player, records invite ───────
  const handleInvite = useCallback(async () => {
    if (!video) return;
    if (invited) {
      await cancelInvite(musicianId);
      showToast(`❌ ${video.name} — dəvət ləğv edildi`);
    } else {
      // Build minimal musician from video item
      await sendInvite({
        id:         musicianId,
        uid:        video.uid,
        name:       video.name,
        emoji:      video.emoji,
        instrument: video.instrument,
        city:       video.city,
        rating:     5,
        reviews:    0,
      } as any);
      showToast(`✅ ${video.name} — dəvət göndərildi!`);
    }
  }, [video, invited, musicianId, sendInvite, cancelInvite, showToast]);

  if (!video) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      {/* FIX 1: one SafeAreaView wrapping everything — button always below status bar */}
      <SafeAreaView style={s.playerScreen} edges={['top', 'bottom']}>

        {/* Video area */}
        <View style={s.playerScreen2}>
          <Text style={s.playerBgEmoji}>{video.emoji}</Text>
          <Text style={s.playerEmoji}>{video.emoji}</Text>

          {/* Back button — 60px from top works on all iPhones */}
          <TouchableOpacity
            style={s.backBtnFloat}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={s.backBtnFloatText}>✕</Text>
          </TouchableOpacity>

          {/* Skip -10s — text symbol, no emoji */}
          <TouchableOpacity
            style={s.skipLeft}
            onPress={() => seekTo(Math.max(0, (currentSec - 10) / totalSec))}
            activeOpacity={0.5}
          >
            <Text style={s.skipArrow}>«</Text>
            <Text style={s.skipLabel}>10s</Text>
          </TouchableOpacity>

          {/* Play/pause — center */}
          <TouchableOpacity
            style={s.playBtn}
            onPress={() => setPlaying(p => !p)}
            activeOpacity={0.6}
          >
            <Text style={s.playBtnText}>{playing ? '❙❙' : '▶'}</Text>
          </TouchableOpacity>

          {/* Skip +10s */}
          <TouchableOpacity
            style={s.skipRight}
            onPress={() => seekTo(Math.min(1, (currentSec + 10) / totalSec))}
            activeOpacity={0.5}
          >
            <Text style={s.skipArrow}>»</Text>
            <Text style={s.skipLabel}>10s</Text>
          </TouchableOpacity>

          {playing && (
            <View style={s.waveform}>
              {waveAnims.map((w, i) => (
                <Animated.View
                  key={`wave-${i}`}
                  style={[s.waveBar, { transform: [{ scaleY: w }], height: 4 + (i % 3) * 8 }]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={s.playerControls}>
          {/* FIX 2: use onLayout to get real bar width, not constant */}
          <View style={s.progressWrap}>
            {/* Large 44px touch zone */}
            <View
              style={s.progressBar}
              {...sliderHandlers}
              onLayout={e => { barWidthRef.current = e.nativeEvent.layout.width; }}
            >
              {/* Visual track — 5px centered */}
              <View style={s.progressTrack}>
                <Animated.View style={[s.progressFill, { flex: progress }]} />
                <Animated.View style={[s.progressRemain, { flex: progressRem }]} />
              </View>
              {/* Draggable thumb */}
              <Animated.View
                style={[
                  s.progressThumb,
                  {
                    left: progress.interpolate({
                      inputRange:  [0, 1],
                      outputRange: [0, (barWidthRef.current || PROGRESS_BAR_WIDTH) - 18],
                    }),
                  },
                ]}
                pointerEvents="none"
              />
            </View>
            <View style={s.timeRow}>
              <Text style={s.timeText}>{formatTime(currentSec)}</Text>
              <Text style={s.timeText}>{video.duration}</Text>
            </View>
          </View>

          {/* Info + buttons */}
          <View style={s.playerCtlRow}>
            <View style={s.playerInfo}>
              <View style={s.playerAva}>
                <Text style={{ fontSize: 18 }}>{video.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.playerName} numberOfLines={1}>{video.name}</Text>
                <Text style={s.playerInst}>{video.instrument} · {video.city}</Text>
              </View>
            </View>
            <View style={s.playerBtns}>
              <TouchableOpacity
                style={s.playerBtnOutline}
                onPress={() => showToast('✉️ Mesaj...')}
              >
                <Text style={{ color: 'white', fontSize: 16 }}>✉️</Text>
              </TouchableOpacity>
              {/* FIX 3: stays in player, toggles invite */}
              <TouchableOpacity
                style={[s.playerBtnGold, invited && s.playerBtnCancel]}
                onPress={handleInvite}
              >
                <Text style={[s.playerBtnGoldText, invited && { color: Colors.red }]}>
                  {invited ? '❌ Ləğv Et' : t('videoBtnHire')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ── Video Card ────────────────────────────────────────────
const VVCard = React.memo(function VVCard({ video, onPress }: {
  video: VideoItem; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.vvCard} onPress={onPress} activeOpacity={0.85}>
      {video.badge && (
        <View style={[s.vvBadge, video.badge === 'top' && s.vvBadgeTop]}>
          <Text style={s.vvBadgeText}>{video.badge === 'new' ? 'YENİ' : 'TOP'}</Text>
        </View>
      )}
      <View style={s.vvThumb}>
        <Text style={s.vvBgEmoji}>{video.emoji}</Text>
        <Text style={s.vvEmoji}>{video.emoji}</Text>
        <View style={s.vvPlay}>
          <Text style={{ color: 'white', fontSize: 14 }}>▶</Text>
        </View>
        <Text style={s.vvDuration}>{video.duration}</Text>
      </View>
      <View style={s.vvBottom}>
        <Text style={s.vvName} numberOfLines={1}>{video.name}</Text>
        <Text style={s.vvInst}>{video.instrument}</Text>
        <View style={s.vvFooter}>
          <Text style={s.vvViews}>
            👁 {video.views >= 1000 ? `${(video.views / 1000).toFixed(1)}K` : video.views}
          </Text>
          <Text style={s.vvStars}>{video.rating}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ── Video Screen ──────────────────────────────────────────
export default function VideoScreen() {
  const { t } = useT();
  const videos = useAppStore(st => st.videos);
  const [activeFilter,  setActiveFilter]  = useState('');
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  const filtered = videos.filter(v =>
    !activeFilter || v.instrument.includes(activeFilter)
  );

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.topRow}>
        <Text style={s.screenTitle}>{t('videoTitle')}</Text>
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}
      >
        {FILTERS.map(f => {
          const label = t(f as Parameters<typeof t>[0]);
          const val   = f === 'filterAll' ? '' : label.replace(/^\S+\s+/, '');
          return (
            <TouchableOpacity
              key={f}
              style={[s.ftag, activeFilter === val && s.ftagActive]}
              onPress={() => setActiveFilter(val)}
            >
              <Text style={[s.ftagText, activeFilter === val && s.ftagTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.grid}>
          {filtered.map(v => (
            <VVCard key={v.id} video={v} onPress={() => setSelectedVideo(v)} />
          ))}
        </View>
      </ScrollView>

      <VideoPlayer
        video={selectedVideo}
        visible={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: Colors.bg },
  topRow:       { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10 },
  screenTitle:  { fontFamily: Typography.playfair700, fontSize: 18, color: Colors.text },
  filterScroll: { flexGrow: 0, marginBottom: 8 },
  ftag:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  ftagActive:   { backgroundColor: Colors.gold, borderColor: Colors.gold },
  ftagText:     { color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito700 },
  ftagTextActive: { color: '#1a0e00' },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vvCard:       { width: '47.5%', backgroundColor: Colors.card, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  vvBadge:      { position: 'absolute', top: 8, left: 8, zIndex: 10, backgroundColor: Colors.gold, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  vvBadgeTop:   { backgroundColor: Colors.red },
  vvBadgeText:  { color: 'white', fontSize: 9, fontFamily: Typography.nunito700 },
  vvThumb:      { aspectRatio: 3/4, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center' },
  vvBgEmoji:    { position: 'absolute', fontSize: 72, opacity: 0.25 },
  vvEmoji:      { fontSize: 36 },
  vvPlay:       { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', bottom: 30 },
  vvDuration:   { position: 'absolute', bottom: 6, right: 8, color: 'white', fontSize: 10, fontFamily: Typography.nunito700 },
  vvBottom:     { padding: 10 },
  vvName:       { fontFamily: Typography.playfair700, fontSize: 13, color: Colors.text, marginBottom: 2 },
  vvInst:       { fontSize: 11, color: Colors.gold, fontFamily: Typography.nunito700, marginBottom: 4 },
  vvFooter:     { flexDirection: 'row', justifyContent: 'space-between' },
  vvViews:      { fontSize: 10, color: Colors.muted, fontFamily: Typography.nunito400 },
  vvStars:      { fontSize: 10, color: Colors.gold },
  // Player
  playerScreen:   { flex: 1, backgroundColor: Colors.bg },
  playerScreen2:  { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  playerBgEmoji:  { position: 'absolute', fontSize: 200, opacity: 0.06 },
  playerEmoji:    { fontSize: 80 },
  // Back button — floating top-left inside video area
  backBtnFloat:     { position: 'absolute', top: 16, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  backBtnFloatText: { fontSize: 16, color: 'white', fontFamily: Typography.nunito700 },
  // Play/pause
  playBtn:        { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  playBtnText:    { fontSize: 30, color: 'rgba(255,255,255,0.75)' },
  // Skip buttons — pure text, no background, no emoji
  skipLeft:       { position: 'absolute', left: 36, alignItems: 'center', justifyContent: 'center', width: 56, height: 56 },
  skipRight:      { position: 'absolute', right: 36, alignItems: 'center', justifyContent: 'center', width: 56, height: 56 },
  skipArrow:      { fontSize: 26, color: 'rgba(255,255,255,0.6)', fontFamily: Typography.nunito700 },
  skipLabel:      { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: Typography.nunito700, marginTop: 1 },
  waveform:       { position: 'absolute', bottom: 20, flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  waveBar:        { width: 4, backgroundColor: Colors.gold, borderRadius: 2 },
  playerControls: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.bg2 },
  progressWrap:   { marginBottom: 18 },
  progressBar:    { height: 44, backgroundColor: 'transparent', flexDirection: 'row', position: 'relative', alignItems: 'center', marginBottom: 2 },
  progressTrack:  { position: 'absolute', left: 0, right: 0, height: 5, flexDirection: 'row', borderRadius: 3, overflow: 'hidden', backgroundColor: Colors.bg3 },
  progressFill:   { height: 5, backgroundColor: Colors.gold },
  progressRemain: { height: 5, backgroundColor: 'transparent' },
  progressThumb:  { position: 'absolute', top: 13, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.gold2 },
  timeRow:        { flexDirection: 'row', justifyContent: 'space-between' },
  timeText:       { fontSize: 11, color: Colors.muted, fontFamily: Typography.nunito400 },
  playerCtlRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  playerInfo:     { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  playerAva:      { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.gold, flexShrink: 0 },
  playerName:     { fontFamily: Typography.playfair700, fontSize: 14, color: 'white' },
  playerInst:     { fontSize: 11, color: Colors.gold, fontFamily: Typography.nunito600 },
  playerBtns:     { flexDirection: 'row', gap: 8, flexShrink: 0 },
  playerBtnOutline: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  playerBtnGold:    { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: Colors.gold },
  playerBtnCancel:  { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.red },
  playerBtnGoldText:{ color: '#1a0e00', fontSize: 12, fontFamily: Typography.nunito700 },
});
