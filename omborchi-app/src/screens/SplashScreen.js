import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { COLORS } from '../utils/constants';

const { width, height } = Dimensions.get('window');
const LETTERS = 'OMBORCHI'.split('');

export default function SplashScreen({ onFinish }) {
  const kaftimadaOpacity = useRef(new Animated.Value(0)).current;
  const letterAnims = useRef(LETTERS.map(() => new Animated.Value(0))).current;
  const formSlide = useRef(new Animated.Value(60)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(kaftimadaOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.delay(300),
      Animated.stagger(
        80,
        letterAnims.map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          })
        )
      ),
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(formSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setTimeout(onFinish, 400);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.kaftimda, { opacity: kaftimadaOpacity }]}>
        by KAFTIMDA
      </Animated.Text>

      <View style={styles.lettersRow}>
        {LETTERS.map((letter, index) => (
          <Animated.Text
            key={index}
            style={[
              styles.letter,
              {
                opacity: letterAnims[index],
                transform: [
                  {
                    translateY: letterAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {letter}
          </Animated.Text>
        ))}
      </View>

      <Animated.View
        style={[
          styles.tagline,
          {
            opacity: formOpacity,
            transform: [{ translateY: formSlide }],
          },
        ]}
      >
        <Text style={styles.taglineText}>Ombor boshqaruv tizimi</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kaftimda: {
    color: COLORS.textSecondary,
    fontSize: 14,
    letterSpacing: 3,
    marginBottom: 24,
    textTransform: 'uppercase',
  },
  lettersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  letter: {
    color: COLORS.primary,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 4,
  },
  tagline: {
    marginTop: 16,
  },
  taglineText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    letterSpacing: 1,
  },
});
