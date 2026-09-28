const CODING_SAVED_CODES_KEY = 'bodhaq_coding_saved_codes';
const CODING_CURRENT_WORKSPACE_KEY = 'bodhaq_coding_current_workspace';

export function getSavedCodes() {
  try {
    const data = localStorage.getItem(CODING_SAVED_CODES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading saved codes:', err);
    return [];
  }
}

export function saveCode(codeItem) {
  const codes = getSavedCodes();
  const existingIndex = codes.findIndex((c) => c.id === codeItem.id);

  if (existingIndex >= 0) {
    // Update existing
    codes[existingIndex] = { ...codes[existingIndex], ...codeItem, updatedAt: new Date().toISOString() };
  } else {
    // Add new
    if (codes.length >= 5) {
      throw new Error('Maximum 5 saved codes allowed.');
    }
    codes.push({
      ...codeItem,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  localStorage.setItem(CODING_SAVED_CODES_KEY, JSON.stringify(codes));
}

export function deleteSavedCode(id) {
  const codes = getSavedCodes();
  const newCodes = codes.filter((c) => c.id !== id);
  localStorage.setItem(CODING_SAVED_CODES_KEY, JSON.stringify(newCodes));
}

export function getCurrentWorkspace() {
  try {
    const data = localStorage.getItem(CODING_CURRENT_WORKSPACE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Error reading current workspace:', err);
    return null;
  }
}

export function saveCurrentWorkspace(workspaceData) {
  localStorage.setItem(CODING_CURRENT_WORKSPACE_KEY, JSON.stringify(workspaceData));
}

export function clearCurrentWorkspace() {
  localStorage.removeItem(CODING_CURRENT_WORKSPACE_KEY);
}
