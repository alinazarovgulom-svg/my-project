import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';

export default function KaftimдaBadge() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = () => {
      Animated.sequence([
        Animated.delay(5000),
        Animated.timing(shimmer, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start(loop);
    };
    loop();
    return () => shimmer.stopAnimation();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1, 0.6] });
  const scale = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });

  return (
    <Animated.Text style={[styles.text, { opacity, transform: [{ scale }] }]}>
      by KAFTIMDA
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
