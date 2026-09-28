const BODHAQ_ACTIVE_RESUME = 'bodhaq_active_resume';
const BODHAQ_QUIZ_HISTORY = 'bodhaq_quiz_history';
const BODHAQ_LEARNING_GAPS = 'bodhaq_learning_gaps';
const BODHAQ_RESUME_QUIZ_PREFIX = 'bodhaq_resume_quiz_';

// Helper to safely parse JSON
const safeParse = (value, fallback = null) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Error parsing localStorage JSON:', error);
    // If it's malformed, remove the key so it doesn't keep failing? 
    // It's safer to just return fallback and not auto-delete here, 
    // or maybe the user wants it deleted. The instructions say: "remove only the corrupted key"
    return fallback;
  }
};

// Enhanced safeParse that handles corrupted key removal
const safeGetItem = (key, fallback = null) => {
  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch (e) {
      console.warn(`Error parsing localStorage JSON for ${key}:`, e);
      // Instructions: "remove only the corrupted key"
      localStorage.removeItem(key);
      return fallback;
    }
  } catch (e) {
    // Instructions: "If localStorage is unavailable or throws... fail gracefully"
    console.warn(`localStorage getItem failed for ${key}:`, e);
    return fallback;
  }
};

const safeSetItem = (key, value) => {
  try {
    const str = JSON.stringify(value);
    localStorage.setItem(key, str);
  } catch (e) {
    console.warn(`localStorage setItem failed for ${key}:`, e);
  }
};

const safeRemoveItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`localStorage removeItem failed for ${key}:`, e);
  }
};

// --- Active Resume ---
export const getActiveResume = () => {
  return safeGetItem(BODHAQ_ACTIVE_RESUME, null);
};

export const setActiveResume = (resume) => {
  if (!resume) return;
  safeSetItem(BODHAQ_ACTIVE_RESUME, resume);
};

export const clearActiveResume = () => {
  safeRemoveItem(BODHAQ_ACTIVE_RESUME);
};

// --- Quiz History ---
export const getQuizHistory = () => {
  return safeGetItem(BODHAQ_QUIZ_HISTORY, []);
};

export const setQuizHistory = (history) => {
  safeSetItem(BODHAQ_QUIZ_HISTORY, history);
};

export const addQuizToHistory = (quiz) => {
  if (!quiz || !quiz.quizId) return;
  
  let history = getQuizHistory();
  if (!Array.isArray(history)) {
    history = [];
  }
  
  // Check for duplicates
  const exists = history.some(item => item.quizId === quiz.quizId);
  if (exists) {
    return; // Don't add duplicate
  }
  
  // Add to beginning (newest first)
  history.unshift(quiz);
  
  // Retain only max 5
  if (history.length > 5) {
    history = history.slice(0, 5);
  }
  
  setQuizHistory(history);
};

export const removeQuizFromHistory = (quizId) => {
  let history = getQuizHistory();
  if (!Array.isArray(history)) return;
  
  history = history.filter(q => q.quizId !== quizId);
  setQuizHistory(history);
};

export const clearQuizHistory = () => {
  safeRemoveItem(BODHAQ_QUIZ_HISTORY);
};

// --- Learning Gaps ---
export const getLearningGaps = () => {
  return safeGetItem(BODHAQ_LEARNING_GAPS, []);
};

export const setLearningGaps = (gaps) => {
  safeSetItem(BODHAQ_LEARNING_GAPS, gaps);
};

export const clearLearningGaps = () => {
  safeRemoveItem(BODHAQ_LEARNING_GAPS);
};

// --- Resume Quiz Progress ---
export const getResumeQuizProgress = (itemId) => {
  if (!itemId) return null;
  return safeGetItem(`${BODHAQ_RESUME_QUIZ_PREFIX}${itemId}`, null);
};

export const setResumeQuizProgress = (itemId, progress) => {
  if (!itemId || !progress) return;
  safeSetItem(`${BODHAQ_RESUME_QUIZ_PREFIX}${itemId}`, progress);
};

export const clearResumeQuizProgress = (itemId) => {
  if (!itemId) return;
  safeRemoveItem(`${BODHAQ_RESUME_QUIZ_PREFIX}${itemId}`);
};
