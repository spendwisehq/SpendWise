// mobile/app/(tabs)/add.jsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../src/context/ThemeContext';
import { useCreateTransaction } from '../../src/hooks/useTransactions';
import { useCategories } from '../../src/hooks/useCategories';
import { spacing, radius, fontSize, fontWeight } from '../../src/theme/spacing';

export default function AddTransactionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const createMutation = useCreateTransaction();
  const { data: categories = [] } = useCategories();

  const [type, setType]               = useState('expense');
  const [amount, setAmount]           = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]       = useState('');

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Toast.show({ type: 'error', text1: 'Please enter a valid amount' });
      return;
    }
    if (!description.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter a description' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        amount: parseFloat(amount),
        description: description.trim(),
        type,
        category: category || undefined,
        date: new Date().toISOString(),
      });
      // Reset form
      setAmount('');
      setDescription('');
      setCategory('');
      router.navigate('/(tabs)/transactions');
    } catch {
      // Error handled by the mutation's onError
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Add Transaction
          </Text>

          {/* Type Toggle */}
          <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              onPress={() => setType('expense')}
              style={[
                styles.toggleBtn,
                type === 'expense' && { backgroundColor: colors.danger + '20' },
              ]}
            >
              <Text style={{ color: type === 'expense' ? colors.danger : colors.textMuted, fontWeight: fontWeight.semibold, fontSize: fontSize.base }}>
                Expense
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setType('income')}
              style={[
                styles.toggleBtn,
                type === 'income' && { backgroundColor: colors.success + '20' },
              ]}
            >
              <Text style={{ color: type === 'income' ? colors.success : colors.textMuted, fontWeight: fontWeight.semibold, fontSize: fontSize.base }}>
                Income
              </Text>
            </Pressable>
          </View>

          {/* Amount */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
            <TextInput
              style={[styles.amountInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={description}
              onChangeText={setDescription}
              placeholder="What was this for?"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              <View style={styles.categoryRow}>
                {categories.map(cat => (
                  <Pressable
                    key={cat._id}
                    onPress={() => setCategory(cat._id === category ? '' : cat._id)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: category === cat._id ? colors.primary : colors.surface,
                        borderColor: category === cat._id ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{
                      color: category === cat._id ? '#FFFFFF' : colors.textSecondary,
                      fontSize: fontSize.sm,
                      fontWeight: fontWeight.medium,
                    }}>
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Submit */}
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary, opacity: createMutation.isPending ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Add Transaction</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    padding: spacing['2xl'],
    paddingBottom: spacing['5xl'],
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginBottom: spacing['2xl'],
  },
  toggleRow: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 4,
    marginBottom: spacing['2xl'],
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  field: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  amountInput: {
    height: 56,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.base,
  },
  categoryScroll: {
    marginHorizontal: -spacing['2xl'],
    paddingHorizontal: spacing['2xl'],
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  button: {
    height: 52,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing['2xl'],
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
