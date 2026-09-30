const CODING_SAVED_CODES_KEY =
  'bodhaq_coding_saved_codes';

const CODING_CURRENT_WORKSPACE_KEY =
  'bodhaq_coding_current_workspace';

const MAX_SAVED_CODES = 5;


function isObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}


function normalizeId(value) {
  return (
    typeof value === 'string' &&
    value.trim()
  )
    ? value.trim()
    : null;
}


function readLocalStorage(key, fallback) {
  try {
    const data =
      localStorage.getItem(key);

    if (!data) {
      return fallback;
    }

    const parsed =
      JSON.parse(data);

    return parsed;
  } catch {
    return fallback;
  }
}


function writeLocalStorage(
  key,
  value
) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

    return true;
  } catch {
    return false;
  }
}


export function getSavedCodes() {
  const data =
    readLocalStorage(
      CODING_SAVED_CODES_KEY,
      []
    );

  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter(
    (item) =>
      isObject(item) &&
      normalizeId(item.id)
  );
}


export function saveCode(codeItem) {
  if (!isObject(codeItem)) {
    throw new Error(
      'Invalid code data.'
    );
  }

  const id =
    normalizeId(codeItem.id);

  if (!id) {
    throw new Error(
      'A valid code ID is required.'
    );
  }

  const codes =
    getSavedCodes();

  const existingIndex =
    codes.findIndex(
      (code) =>
        code.id === id
    );

  const now =
    new Date().toISOString();

  if (existingIndex >= 0) {
    /*
     * Update the complete saved workspace.
     *
     * This intentionally spreads the entire
     * codeItem so AI Learn metadata such as:
     *
     * - problemId
     * - problemStatement
     * - inputFormat
     * - outputFormat
     * - constraints
     * - examples
     * - publicTests
     * - hiddenTestCount
     * - difficulty
     * - topics
     * - starter code
     * - language
     * - sourceMode
     *
     * is preserved when supplied by
     * CodingWorkspace.
     */
    codes[existingIndex] = {
      ...codes[existingIndex],
      ...codeItem,
      id,
      updatedAt: now,
    };
  } else {
    if (
      codes.length >=
      MAX_SAVED_CODES
    ) {
      throw new Error(
        `Maximum ${MAX_SAVED_CODES} saved codes allowed.`
      );
    }

    codes.push({
      ...codeItem,
      id,
      createdAt: now,
      updatedAt: now,
    });
  }

  const saved =
    writeLocalStorage(
      CODING_SAVED_CODES_KEY,
      codes
    );

  if (!saved) {
    throw new Error(
      'Unable to save code. Browser storage may be unavailable or full.'
    );
  }
}


export function deleteSavedCode(id) {
  const normalizedId =
    normalizeId(id);

  if (!normalizedId) {
    return;
  }

  const codes =
    getSavedCodes();

  const newCodes =
    codes.filter(
      (code) =>
        code.id !== normalizedId
    );

  writeLocalStorage(
    CODING_SAVED_CODES_KEY,
    newCodes
  );
}


export function getCurrentWorkspace() {
  const data =
    readLocalStorage(
      CODING_CURRENT_WORKSPACE_KEY,
      null
    );

  if (!isObject(data)) {
    return null;
  }

  return data;
}


export function saveCurrentWorkspace(
  workspaceData
) {
  if (!isObject(workspaceData)) {
    return false;
  }

  return writeLocalStorage(
    CODING_CURRENT_WORKSPACE_KEY,
    workspaceData
  );
}


export function clearCurrentWorkspace() {
  try {
    localStorage.removeItem(
      CODING_CURRENT_WORKSPACE_KEY
    );

    return true;
  } catch {
    return false;
  }
}