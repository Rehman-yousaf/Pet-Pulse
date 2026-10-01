/**
 * Reusable form/screen wrapper: SafeAreaView + KeyboardAvoidingView + ScrollView.
 * Use on every form screen so content scrolls and keyboard never hides inputs/buttons.
 */

import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  /** Extra bottom padding so submit button stays visible when keyboard is open. Default 40. */
  paddingBottom?: number;
  /** Safe area edges. Default ['top'] for screens with header. */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenWrapper({
  children,
  style,
  contentContainerStyle,
  paddingBottom = 40,
  edges = ['top'],
}: ScreenWrapperProps) {
  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom },
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    padding: 16,
    flexGrow: 1,
  },
});
