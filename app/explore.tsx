import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const FAKE_CAPTIONS = [
  "Good morning class, let's get started.",
  "Today we will discuss inclusive education.",
  "Please open your books to page 42.",
  "Can everyone hear me clearly?",
  "Let's take a short break.",
  "Now, who can answer this question?",
  "Very good! That is correct.",
  "Let's move on to the next topic.",
  "Please take note of this.",
  "That's all for today. Thank you!",
];

export default function LiveCaption() {
  const [captions, setCaptions] = useState<string[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < FAKE_CAPTIONS.length) {
        setCaptions((prev) => [...prev, FAKE_CAPTIONS[index]]);
        index++;
        scrollRef.current?.scrollToEnd({ animated: true });
      } else {
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🎙️ Live Caption</Text>
      <Text style={styles.status}>● Live</Text>
      <ScrollView ref={scrollRef} style={styles.captionBox}>
        {captions.map((line, i) => (
          <Text key={i} style={styles.captionText}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    padding: 24,
    paddingTop: 20,
  },
  header: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  status: { color: "#4caf50", fontSize: 13, marginBottom: 16 },
  captionBox: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
  },
  captionText: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 14,
    lineHeight: 26,
  },
});
