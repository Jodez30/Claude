import { useState, useCallback } from 'react';
import { allLessons } from './data/lessons';
import { useProgress } from './hooks/useProgress';
import HomeScreen from './components/HomeScreen';
import LessonScreen from './components/LessonScreen';

type Screen = { type: 'home' } | { type: 'lesson'; lessonId: string };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ type: 'home' });
  const { progress, completeLesson } = useProgress();

  const goToLesson = useCallback((lessonId: string) => {
    setScreen({ type: 'lesson', lessonId });
  }, []);

  const goHome = useCallback(() => {
    setScreen({ type: 'home' });
  }, []);

  const getNextLesson = (currentId: string): string | undefined => {
    const idx = allLessons.findIndex((l) => l.id === currentId);
    return allLessons[idx + 1]?.id;
  };

  if (screen.type === 'lesson') {
    const lesson = allLessons.find((l) => l.id === screen.lessonId);
    if (!lesson) return null;
    const nextId = getNextLesson(lesson.id);

    return (
      <LessonScreen
        lesson={lesson}
        isCompleted={progress.completedLessons.has(lesson.id)}
        onBack={goHome}
        onComplete={completeLesson}
        onNext={nextId ? () => goToLesson(nextId) : undefined}
      />
    );
  }

  return (
    <HomeScreen
      completedLessons={progress.completedLessons}
      xp={progress.xp}
      streak={progress.streak}
      onSelectLesson={goToLesson}
    />
  );
}
