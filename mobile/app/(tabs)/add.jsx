// Add transaction sheet (full-screen page presentation).
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../../src/theme/colors';
import { fonts, fontWeight, text } from '../../src/theme/typography';
import { Icon } from '../../src/components/ui/Icon';
import { IconButton } from '../../src/components/ui/TopBar';
import Field from '../../src/components/ui/Field';
import PrimaryButton from '../../src/components/ui/PrimaryButton';
import { CATEGORIES as SEED_CATS } from '../../src/utils/seedData';
import { useCategories } from '../../src/hooks/useCategories';
import { useCreateTransaction } from '../../src/hooks/useTransactions';

const normalizeCat = (c) => ({
  _id:   c._id   || c.key,
  name:  c.name  || c.key,
  emoji: c.icon  || c.emoji || '📋',
  color: c.color || '#68dbae',
});

const FALLBACK = SEED_CATS.map(normalizeCat);

export default function AddScreen() {
  const router = useRouter();
  const { data: rawCats, isLoading: catsLoading } = useCategories();
  const { mutate: createTx, isPending } = useCreateTransaction();

  const cats = rawCats?.length ? rawCats.map(normalizeCat) : FALLBACK;

  const [amount, setAmount] = useState('');
  const [kind, setKind]     = useState('expense');
  const [catId, setCatId]   = useState(null);
  const [title, setTitle]   = useState('');
  const [note, setNote]     = useState('');

  useEffect(() => {
    if (cats.length && !catId) setCatId(cats[0]._id);
  }, [cats]);

  const handleAmountChange = (val) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (cleaned.length > 9) return;
    setAmount(cleaned);
  };

  const save = () => {
    if (!amount || !catId || isPending) return;
    const selectedCat = cats.find(c => c._id === catId);
    createTx({
      amount:      Number(amount),
      type:        kind,
      category:    catId,
      description: title || selectedCat?.name || '',
      notes:       note,
      date:        new Date().toISOString(),
    }, {
      onSuccess: () => router.back(),
    });
  };

  const canSave    = !!amount && !!catId && !isPending;
  const selectedCat = cats.find(c => c._id === catId);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <IconButton subtle onPress={() => router.back()}>
            <Icon.Close size={18} color={palette.textMuted}/>
          </IconButton>
          <Text style={styles.headerTitle}>New Entry</Text>
          <Pressable onPress={save} disabled={!canSave}>
            <Text style={[styles.save, { color: canSave ? palette.primary : 'rgba(104,219,174,0.4)' }]}>
              {isPending ? '…' : 'SAVE'}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Kind toggle */}
          <View style={styles.kindRow}>
            {[['expense', 'Expense'], ['income', 'Income']].map(([k, l]) => {
              const active = kind === k;
              return (
                <Pressable key={k} onPress={() => setKind(k)} style={[
                  styles.kindBtn,
                  {
                    backgroundColor: active
                      ? (k === 'income' ? '#26a37a' : 'rgba(255,182,132,0.2)')
                      : 'transparent',
                  },
                ]}>
                  <Text style={[styles.kindText, {
                    color: active
                      ? (k === 'income' ? '#003327' : '#ffb684')
                      : palette.textDim,
                  }]}>{l}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Amount hero */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <Text style={[text.eyebrow, { color: palette.textMuted, letterSpacing: 2 }]}>
              AMOUNT TO {kind === 'income' ? 'ADD' : 'SPEND'}
            </Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountSym}>₹</Text>
              <TextInput
                style={[styles.amount, { color: amount ? palette.text : 'rgba(255,255,255,0.25)' }]}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="decimal-pad"
                keyboardAppearance="dark"
                returnKeyType="done"
                maxLength={9}
                autoFocus={false}
                selectionColor={palette.primary}
              />
            </View>
          </View>

          {/* Categories */}
          <Text style={[text.eyebrow, { color: palette.textMuted, marginBottom: 10, paddingLeft: 4 }]}>
            CATEGORY
          </Text>
          {catsLoading ? (
            <ActivityIndicator color={palette.primary} style={{ marginBottom: 20 }}/>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catRow}>
              {cats.map(c => {
                const active = catId === c._id;
                return (
                  <Pressable key={c._id} onPress={() => setCatId(c._id)} style={[
                    styles.catChip,
                    {
                      backgroundColor: active ? `${c.color}1f` : 'rgba(255,255,255,0.03)',
                      borderColor:     active ? `${c.color}4d` : 'rgba(255,255,255,0.05)',
                    },
                  ]}>
                    <Text style={{ fontSize: 14 }}>{c.emoji}</Text>
                    <Text style={[styles.catText, { color: active ? c.color : palette.textMuted }]}>
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Fields */}
          <View style={{ gap: 14, marginBottom: 24 }}>
            <Field label="MERCHANT / TITLE" value={title} onChangeText={setTitle}
                   placeholder={selectedCat?.name || 'Description'}/>
            <Field label="NOTE (OPTIONAL)" value={note} onChangeText={setNote}
                   placeholder="Add a memo…"/>
          </View>

          <View style={{ marginTop: 8 }}>
            <PrimaryButton full onPress={save} disabled={!canSave}>
              {isPending
                ? <ActivityIndicator color={palette.primaryInk}/>
                : 'Save Entry'}
            </PrimaryButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg, paddingBottom: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    fontSize: 18,
    color: palette.text,
  },
  save: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.bold,
    fontSize: 14,
    letterSpacing: 0.4,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 140,
  },
  kindRow: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: 99,
    padding: 6,
    gap: 6,
    marginBottom: 28,
  },
  kindBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 99,
    alignItems: 'center',
  },
  kindText: {
    fontFamily: fonts.body,
    fontWeight: fontWeight.bold,
    fontSize: 13,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 12,
  },
  amountSym: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.heavy,
    fontSize: 36,
    color: 'rgba(104,219,174,0.8)',
    letterSpacing: -1,
  },
  amount: {
    fontFamily: fonts.display,
    fontWeight: fontWeight.heavy,
    fontSize: 64,
    letterSpacing: -2.5,
    minWidth: 80,
    padding: 0,
  },
  catRow: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: 22,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 99,
    borderWidth: 1,
  },
  catText: {
    fontFamily: fonts.body,
    fontWeight: fontWeight.semibold,
    fontSize: 13,
  },
});
