import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useT } from '../../i18n';
import { useAppStore, FunCard } from '../../store/useAppStore';
import BottomSheet from '../../components/modals/BottomSheet';

const STORY_TYPES = ['typeFun','typeExciting','typeMusic','typeStage','typeAdvice'] as const;
const EMOJIS = ['😂','❤️','😱','🎉','🎵','🏆'];

function CommentsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useT();
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([
    { id: 'c1', author: 'Anar M.', text: 'Çox gülməli idi 😂' },
    { id: 'c2', author: 'Leyla Ə.', text: 'Mən də belə vəziyyətdə olmuşam!' },
  ]);

  const addComment = () => {
    if (!commentText.trim()) return;
    setComments(prev => [...prev, { id: `c_${Date.now()}`, author: 'Siz', text: commentText }]);
    setCommentText('');
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.modalTitle}>{t('commentsTitle')}</Text>
      {comments.map(c => (
        <View key={c.id} style={styles.commentItem}>
          <View style={styles.commentAva}><Text style={{ fontSize: 14 }}>🎵</Text></View>
          <View>
            <Text style={styles.commentName}>{c.author}</Text>
            <Text style={styles.commentText}>{c.text}</Text>
          </View>
        </View>
      ))}
      <View style={styles.commentInput}>
        <TextInput
          style={styles.commentField}
          placeholder={t('commentPlaceholder')}
          placeholderTextColor={Colors.muted}
          value={commentText}
          onChangeText={setCommentText}
          onSubmitEditing={addComment}
        />
        <TouchableOpacity style={styles.commentSend} onPress={addComment}>
          <Text style={{ color: '#1a0e00', fontSize: 16 }}>➤</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

function StoryCard({ story }: { story: FunCard }) {
  const { reactStory } = useAppStore();
  const [localReactions, setLocal] = useState({ laugh: story.reactions.laugh, heart: story.reactions.heart, clap: story.reactions.clap });
  const [reacted, setReacted] = useState<Set<string>>(new Set());
  const [commentsVisible, setCommentsVisible] = useState(false);

  const react = (key: 'laugh' | 'heart' | 'clap') => {
    setReacted(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setLocal(r => ({ ...r, [key]: r[key] - 1 }));
      } else {
        next.add(key);
        setLocal(r => ({ ...r, [key]: r[key] + 1 }));
        reactStory(story.id, key);
      }
      return next;
    });
  };

  return (
    <View style={styles.funCard}>
      <View style={styles.funHeader}>
        <View style={styles.funAva}><Text style={{ fontSize: 18 }}>🎵</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.funAuthor}>{story.author}</Text>
          <Text style={styles.funRole}>{story.role}</Text>
          <Text style={styles.funTime}>{story.time}</Text>
        </View>
        <Text style={{ fontSize: 22 }}>{story.emojiTag}</Text>
      </View>
      <Text style={styles.funTitle}>{story.title}</Text>
      <Text style={styles.funText}>{story.text}</Text>
      <View style={styles.funActions}>
        <TouchableOpacity
          style={[styles.reactBtn, reacted.has('laugh') && styles.reactBtnActive]}
          onPress={() => react('laugh')}
        >
          <Text style={styles.reactBtnText}>😂 <Text>{localReactions.laugh}</Text></Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.reactBtn, reacted.has('heart') && styles.reactBtnActive]}
          onPress={() => react('heart')}
        >
          <Text style={styles.reactBtnText}>❤️ <Text>{localReactions.heart}</Text></Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.reactBtn, reacted.has('clap') && styles.reactBtnActive]}
          onPress={() => react('clap')}
        >
          <Text style={styles.reactBtnText}>👏 <Text>{localReactions.clap}</Text></Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={[styles.reactBtn, { borderColor: Colors.gold }]} onPress={() => setCommentsVisible(true)}>
          <Text style={[styles.reactBtnText, { color: Colors.gold }]}>💬 {story.comments}</Text>
        </TouchableOpacity>
      </View>
      <CommentsSheet visible={commentsVisible} onClose={() => setCommentsVisible(false)} />
    </View>
  );
}

export default function StoriesScreen() {
  const { t } = useT();
  const { stories, addStory, showToast } = useAppStore();
  const [shareModal, setShareModal] = useState(false);
  const [storyText, setStoryText]   = useState('');
  const [selType, setSelType]       = useState('');
  const [selEmoji, setSelEmoji]     = useState('😂');

  const submit = () => {
    if (!storyText.trim()) { showToast(t('toastValidText')); return; }
    addStory({
      id: `st_${Date.now()}`,
      author: 'Siz',
      role: '🎵 Musiqiçi',
      emoji: selEmoji,
      emojiTag: selEmoji,
      title: selType || 'Hekayə',
      text: storyText,
      reactions: { laugh: 0, heart: 0, clap: 0 },
      comments: 0,
      time: 'Az əvvəl',
    });
    setShareModal(false);
    setStoryText(''); setSelType(''); setSelEmoji('😂');
    showToast(t('toastStoryPosted'));
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Text style={styles.screenTitle}>{t('storiesTitle')}</Text>
        <TouchableOpacity style={styles.postBtn} onPress={() => setShareModal(true)}>
          <Text style={styles.postBtnText}>{t('storiesShare')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {stories.map(item => <StoryCard key={item.id} story={item} />)}
      </ScrollView>

      <BottomSheet visible={shareModal} onClose={() => setShareModal(false)}>
        <Text style={styles.modalTitle}>{t('funModalTitle')}</Text>
        <Text style={styles.lbl}>{t('funLblType')}</Text>
        <View style={styles.typeRow}>
          {STORY_TYPES.map(k => (
            <TouchableOpacity key={k} style={[styles.instBtn, selType === t(k) && styles.instBtnSel]} onPress={() => setSelType(t(k))}>
              <Text style={[styles.instBtnText, selType === t(k) && styles.instBtnTextSel]}>{t(k)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.lbl}>{t('funLblEmoji')}</Text>
        <View style={styles.emojiRow}>
          {EMOJIS.map(e => (
            <TouchableOpacity
              key={e}
              style={[styles.emojiBtn, selEmoji === e && styles.emojiBtnActive]}
              onPress={() => setSelEmoji(e)}
            >
              <Text style={{ fontSize: 24 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.lbl}>{t('funLblText')}</Text>
        <TextInput
          style={[styles.inp, { height: 100 }]}
          multiline
          placeholder={t('funPlaceholder')}
          placeholderTextColor={Colors.muted}
          value={storyText}
          onChangeText={setStoryText}
        />
        <TouchableOpacity style={styles.submitBtn} onPress={submit}>
          <Text style={styles.submitBtnText}>{t('funSubmit')}</Text>
        </TouchableOpacity>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10 },
  screenTitle: { fontFamily: Typography.playfair700, fontSize: 18, color: Colors.text },
  postBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.gold },
  postBtnText: { color: '#1a0e00', fontSize: 12, fontFamily: Typography.nunito700 },

  funCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 20, padding: 16, marginBottom: 12 },
  funHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  funAva: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border },
  funAuthor: { fontFamily: Typography.playfair700, fontSize: 14, color: Colors.text },
  funRole: { fontSize: 11, color: Colors.gold, fontFamily: Typography.nunito700 },
  funTime: { fontSize: 10, color: Colors.muted, fontFamily: Typography.nunito400 },
  funTitle: { fontFamily: Typography.playfair700, fontSize: 16, color: Colors.gold2, marginBottom: 8 },
  funText: { fontSize: 14, color: '#d4c090', lineHeight: 24, marginBottom: 12, fontFamily: Typography.nunito400 },
  funActions: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  reactBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  reactBtnActive: { backgroundColor: 'rgba(212,160,60,0.15)', borderColor: Colors.gold },
  reactBtnText: { fontSize: 13, color: Colors.text, fontFamily: Typography.nunito600 },

  commentItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  commentAva: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center' },
  commentName: { fontSize: 12, fontFamily: Typography.nunito700, color: Colors.text, marginBottom: 2 },
  commentText: { fontSize: 13, color: Colors.muted, fontFamily: Typography.nunito400 },
  commentInput: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  commentField: { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, color: Colors.text, fontSize: 14, fontFamily: Typography.nunito400 },
  commentSend: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },

  modalTitle: { fontFamily: Typography.playfair700, fontSize: 20, color: Colors.text, marginBottom: 16 },
  lbl: { fontSize: 12, color: Colors.muted, fontFamily: Typography.nunito700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  inp: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 14, fontFamily: Typography.nunito400, marginBottom: 10 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  instBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border },
  instBtnSel: { backgroundColor: 'rgba(212,160,60,0.15)', borderColor: Colors.gold },
  instBtnText: { color: Colors.muted, fontSize: 12, fontFamily: Typography.nunito700 },
  instBtnTextSel: { color: Colors.gold },
  emojiRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  emojiBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  emojiBtnActive: { borderColor: Colors.gold, backgroundColor: 'rgba(212,160,60,0.1)' },
  submitBtn: { backgroundColor: Colors.gold, borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  submitBtnText: { color: '#1a0e00', fontSize: 14, fontFamily: Typography.nunito700 },
});
