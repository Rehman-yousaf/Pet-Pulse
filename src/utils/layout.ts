import { Platform } from 'react-native';

/** iOS needs padding; Android resizes the window, so extra height behavior causes jumps. */
export const keyboardAvoidingBehavior = Platform.OS === 'ios' ? 'padding' : undefined;
