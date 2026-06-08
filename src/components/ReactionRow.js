import React, { useContext } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { COLORS } from '../constants/colors';
import { AuthContext } from '../context/AuthContext';
import { saveGameSession } from '../utils/firebase';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ReactionButton({ emoji, selected, onPress }) {
  const scale = useSharedValue(selected ? 1.2 : 1);

  React.useEffect(() => {
    scale.value = withSpring(selected ? 1.2 : 1, { damping: 12, stiffness: 200 });
  }, [selected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.reactionBtn,
        selected && styles.reactionBtnSelected,
        animatedStyle,
      ]}
    >
      <Text style={styles.reactionEmoji}>{emoji}</Text>
    </AnimatedPressable>
  );
}

export default function ReactionRow({
  reactions = ['❤️', '😂', '😮', '😢', '🔥'],
  onReact,
  selectedReaction,
  onSaveReaction,
}) {
  const { profile } = useContext(AuthContext);

  const handleReact = async (reaction) => {
    onReact?.(reaction);

    if (onSaveReaction) {
      try {
        await onSaveReaction(reaction);
      } catch (error) {
        console.warn('Failed to save reaction:', error.message);
      }
      return;
    }

    if (profile?.coupleId) {
      try {
        await saveGameSession(profile.coupleId, 'reaction', {
          reaction,
          userId: profile.uid,
          userName: profile.name,
        });
      } catch (error) {
        console.warn('Failed to save reaction:', error.message);
      }
    }
  };

  return (
    <View style={styles.container}>
      {reactions.map((emoji) => (
        <ReactionButton
          key={emoji}
          emoji={emoji}
          selected={selectedReaction === emoji}
          onPress={() => handleReact(emoji)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  reactionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  reactionBtnSelected: {
    borderColor: COLORS.pink,
    backgroundColor: COLORS.screenBg,
  },
  reactionEmoji: {
    fontSize: 24,
  },
});
