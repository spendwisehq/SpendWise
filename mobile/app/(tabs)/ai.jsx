// AI Architect chat
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../../src/theme/colors';
import { fonts, fontWeight, text } from '../../src/theme/typography';
import { Icon } from '../../src/components/ui/Icon';
import TopBar from '../../src/components/ui/TopBar';
import { useAIChat } from '../../src/hooks/useAIChat';

const WELCOME = [
  { role: 'ai', text: "I'm The Architect. Ask me about your spending, goals, or what to optimise next.", time: '' },
];

const SUGGESTIONS = [
  'How much did I spend on dining this month?',
  'Where can I cut back?',
  'Am I on track with my budget?',
];

const textStyles = {
  eyebrow: {
    fontFamily: fonts.body,
    fontWeight: fontWeight.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
};

const timeNow = () => {
  const d = new Date();
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0');
  return ((h % 12) || 12) + ':' + m + ' ' + (h >= 12 ? 'PM' : 'AM');
};

export default function AIScreen() {
  const [messages, setMessages] = useState(WELCOME);
  const [input, setInput]       = useState('');
  const scrollRef               = useRef(null);
  const { mutate: chat, isPending } = useAIChat();

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, isPending]);

  const send = (msg) => {
    const q = (msg ?? input).trim();
    if (!q || isPending) return;
    setInput('');
    const userMsg = { role: 'user', text: q, time: timeNow() };
    setMessages(m => [...m, userMsg]);

    chat(q, {
      onSuccess: (data) => {
        const reply = data?.reply || data?.message || data?.response ||
          'Based on your spending, I see opportunities to optimise. Ask me a specific question for details.';
        setMessages(m => [...m, { role: 'ai', text: reply, time: timeNow() }]);
      },
      onError: () => {
        setMessages(m => [...m, {
          role: 'ai',
          text: 'Unable to reach the AI assistant right now. Check your connection and try again.',
          time: timeNow(),
        }]);
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar title="The Architect" subtitle="AI FINANCIAL GUIDE" right={<OnlinePill/>}/>

      <KeyboardAvoidingView style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          {messages.map((m, i) =>
            m.role === 'user'
              ? <UserBubble key={i} text={m.text} time={m.time}/>
              : <AIBubble key={i} text={m.text} time={m.time}/>
          )}
          {isPending && <ThinkingBubble/>}
          {messages.length === 1 && !isPending && (
            <View style={{ gap: 8, marginTop: 4 }}>
              {SUGGESTIONS.map(s => (
                <Pressable key={s} onPress={() => send(s)} style={styles.suggestion}>
                  <Text style={styles.suggestionText}>✦ {s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.composerWrap}>
          <View style={styles.composer}>
            <TextInput
              value={input} onChangeText={setInput}
              onSubmitEditing={() => send()}
              placeholder="Ask The Architect…"
              placeholderTextColor={palette.textDim}
              style={styles.composerInput}
              returnKeyType="send"
              editable={!isPending}
            />
            <Pressable onPress={() => send()} disabled={!input.trim() || isPending} style={styles.sendBtn}>
              {input.trim() && !isPending ? (
                <LinearGradient colors={['#cebdff', '#9b7fed']}
                  start={{x:0,y:0}} end={{x:1,y:1}}
                  style={[StyleSheet.absoluteFill, { borderRadius: 99 }]}/>
              ) : null}
              {isPending
                ? <ActivityIndicator size="small" color={palette.tertiary}/>
                : <Icon.Send size={16} color={input.trim() ? palette.tertiaryInk : palette.textDim}/>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function OnlinePill() {
  return (
    <View style={styles.online}>
      <View style={styles.onlineDot}/>
      <Text style={styles.onlineText}>ONLINE</Text>
    </View>
  );
}

function UserBubble({ text, time }) {
  return (
    <View style={{ alignSelf: 'flex-end', maxWidth: '84%', alignItems: 'flex-end' }}>
      <View style={styles.userBubble}>
        <Text style={styles.bubbleText}>{text}</Text>
      </View>
      {time ? <Text style={[styles.bubbleTime, { marginRight: 8 }]}>{time}</Text> : null}
    </View>
  );
}

function AIBubble({ text, time }) {
  return (
    <View style={{ alignSelf: 'flex-start', maxWidth: '84%' }}>
      <View style={styles.aiHeader}>
        <View style={styles.aiBadge}>
          <Icon.Sparkles size={12} color={palette.tertiary}/>
        </View>
        <Text style={[textStyles.eyebrow, { color: palette.tertiary }]}>THE ARCHITECT</Text>
      </View>
      <View style={styles.aiBubble}>
        <Text style={styles.bubbleText}>{text}</Text>
      </View>
      {time ? <Text style={[styles.bubbleTime, { marginLeft: 8 }]}>{time}</Text> : null}
    </View>
  );
}

function ThinkingBubble() {
  return (
    <View style={{ alignSelf: 'flex-start' }}>
      <View style={styles.aiHeader}>
        <View style={styles.aiBadge}>
          <Icon.Sparkles size={12} color={palette.tertiary}/>
        </View>
        <Text style={[textStyles.eyebrow, { color: palette.tertiary }]}>THE ARCHITECT</Text>
      </View>
      <View style={[styles.aiBubble, { paddingVertical: 14, paddingHorizontal: 20 }]}>
        <ActivityIndicator size="small" color={palette.tertiary}/>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 16,
  },
  userBubble: {
    backgroundColor: 'rgba(104,219,174,0.12)',
    borderRadius: 20,
    borderBottomRightRadius: 4,
    padding: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(104,219,174,0.2)',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiBadge: {
    width: 22, height: 22, borderRadius: 99,
    backgroundColor: 'rgba(206,189,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  aiBubble: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    padding: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  bubbleText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: palette.text,
  },
  bubbleTime: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: palette.textDim,
    marginTop: 4,
  },
  suggestion: {
    backgroundColor: 'rgba(206,189,255,0.06)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(206,189,255,0.12)',
  },
  suggestionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.textMuted,
  },
  composerWrap: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    paddingTop: 12,
    backgroundColor: palette.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  composerInput: {
    flex: 1,
    color: palette.text,
    fontFamily: fonts.body,
    fontSize: 15,
    paddingVertical: 6,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 99,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  online: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(104,219,174,0.1)',
    borderRadius: 99,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  onlineDot: {
    width: 6, height: 6, borderRadius: 99,
    backgroundColor: palette.primary,
  },
  onlineText: {
    fontFamily: fonts.body,
    fontWeight: fontWeight.bold,
    fontSize: 10,
    letterSpacing: 1,
    color: palette.primary,
  },
});
