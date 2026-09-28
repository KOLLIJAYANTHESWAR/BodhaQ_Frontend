import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { saveCode, saveCurrentWorkspace, getSavedCodes } from '../../utils/codingStorage';
import { executeCode } from '../../api/codingApi';
import './CodingWorkspace.css';

const DEFAULT_JAVA_CODE = `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, BodhaQ!");
    }
}`;

const DEFAULT_PYTHON_CODE = `def main():
    print("Hello, BodhaQ!")

if __name__ == "__main__":
    main()`;

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export default function CodingWorkspace({ initialProblem, savedCodeId, sourceMode }) {
  const [workspaceState, setWorkspaceState] = useState({
    id: generateId(),
    title: initialProblem?.title || 'Untitled',
    language: 'java',
    code: DEFAULT_JAVA_CODE,
    javaCode: DEFAULT_JAVA_CODE,
    pythonCode: DEFAULT_PYTHON_CODE,
    sourceMode: sourceMode || 'ide',
    problemStatement: initialProblem?.statement || '',
    constraints: initialProblem?.constraints || '',
    sample: initialProblem?.sample || ''
  });

  const [focusMode, setFocusMode] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  
  const [customInput, setCustomInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  const [theme, setTheme] = useState(
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs-light'
  );
  const [panelWidth, setPanelWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const workspaceRef = useRef(null);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setTheme(isDark ? 'vs-dark' : 'vs-light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // If we have a saved code ID, try to load it
    if (savedCodeId) {
      const savedCodes = getSavedCodes();
      const codeItem = savedCodes.find(c => c.id === savedCodeId);
      if (codeItem) {
        setWorkspaceState(prevState => ({
          ...prevState,
          id: codeItem.id,
          title: codeItem.title,
          language: codeItem.language,
          code: codeItem.code,
          javaCode: codeItem.language === 'java' ? codeItem.code : prevState.javaCode,
          pythonCode: codeItem.language === 'python' ? codeItem.code : prevState.pythonCode,
          sourceMode: codeItem.sourceMode || 'ide'
        }));
      }
    } else if (initialProblem) {
      // Just apply initial problem title, keep default code
      setWorkspaceState(prevState => ({
        ...prevState,
        title: initialProblem.title || 'Untitled',
        problemStatement: initialProblem.statement || '',
      }));
    } else {
      import('../../utils/codingStorage').then(({ getCurrentWorkspace }) => {
        const currentWS = getCurrentWorkspace();
        if (currentWS) {
          setWorkspaceState(currentWS);
        }
      });
    }
  }, [savedCodeId, initialProblem]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setWorkspaceState(prev => {
      const updatedPrev = {
        ...prev,
        [prev.language === 'java' ? 'javaCode' : 'pythonCode']: prev.code
      };
      const newCode = newLang === 'java' ? updatedPrev.javaCode : updatedPrev.pythonCode;
      
      const newState = { ...updatedPrev, language: newLang, code: newCode };
      saveCurrentWorkspace(newState);
      return newState;
    });
  };

  const handleCodeChange = (value) => {
    setWorkspaceState(prev => {
      const newState = { 
        ...prev, 
        code: value,
        [prev.language === 'java' ? 'javaCode' : 'pythonCode']: value
      };
      saveCurrentWorkspace(newState);
      return newState;
    });
  };

  const handleSave = () => {
    try {
      saveCode({
        id: workspaceState.id,
        title: workspaceState.title,
        language: workspaceState.language,
        code: workspaceState.code,
        sourceMode: workspaceState.sourceMode
      });
      setActionMessage('Code saved successfully.');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setExecutionResult(null);
    try {
      const result = await executeCode(workspaceState.language, workspaceState.code, customInput);
      setExecutionResult(result);
    } catch (err) {
      setExecutionResult({
        status: "execution_service_unavailable",
        stderr: err.response?.data?.detail || err.message || "Unable to execute code right now.\nPlease try again."
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = () => {
    setActionMessage('Code submission will be available soon.');
    setTimeout(() => setActionMessage(''), 3000);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      if (newWidth > 10 && newWidth < 90) {
        setPanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="coding-workspace-container">
      <header className="workspace-header">
        <div className="workspace-header-left">
          <h2>{workspaceState.title}</h2>
          <select value={workspaceState.language} onChange={handleLanguageChange} className="language-selector">
            <option value="java">Java</option>
            <option value="python">Python</option>
          </select>
        </div>
        <div className="workspace-header-right">
          <label className="focus-mode-toggle">
            <input 
              type="checkbox" 
              checked={focusMode} 
              onChange={(e) => setFocusMode(e.target.checked)} 
            />
            Focus Mode: {focusMode ? 'ON' : 'OFF'}
          </label>
        </div>
      </header>

      <div className="workspace-main" ref={workspaceRef}>
        <div className="workspace-panel problem-panel" style={{ width: `${panelWidth}%`, flex: 'none' }}>
          <h3>Problem</h3>
          {workspaceState.problemStatement ? (
            <div className="problem-content">
              <p>{workspaceState.problemStatement}</p>
              {workspaceState.constraints && (
                <>
                  <h4>Constraints</h4>
                  <pre>{workspaceState.constraints}</pre>
                </>
              )}
              {workspaceState.sample && (
                <>
                  <h4>Sample Test Case</h4>
                  <pre>{workspaceState.sample}</pre>
                </>
              )}
            </div>
          ) : (
            <div className="empty-problem">
              <p>No problem context provided.</p>
              <p>Write your code independently.</p>
            </div>
          )}
          
          <div className="custom-input-section">
            <h4>Custom Input</h4>
            <textarea 
              placeholder="Enter custom input here..." 
              rows={4}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
            ></textarea>
          </div>
        </div>
        
        <div className="workspace-resizer" onMouseDown={handleMouseDown} />

        <div className="workspace-panel editor-panel" style={{ width: `${100 - panelWidth}%`, flex: 'none' }}>
          <Editor
            height="100%"
            language={workspaceState.language}
            theme={theme}
            value={workspaceState.code}
            onChange={handleCodeChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
            }}
          />
        </div>
      </div>

      <footer className="workspace-footer">
        <div className="toolbar">
          <button className="btn-run" onClick={handleRun} disabled={isRunning}>
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <button className="btn-submit" onClick={handleSubmit} disabled={isRunning} title="Submit will be available after test/judge support is implemented.">
            Submit
          </button>
          <button className="btn-save" onClick={handleSave} disabled={isRunning}>
            Save
          </button>
        </div>
        
        {actionMessage && <div className="action-message">{actionMessage}</div>}
        
        <div className="test-results-section">
          <h4>Test / Execution Results</h4>
          {!executionResult && !isRunning && (
            <p className="test-results-placeholder">Click Run to execute your code.</p>
          )}
          {isRunning && (
            <p className="test-results-placeholder">Executing code...</p>
          )}
          {executionResult && (
            <div className={`execution-result ${executionResult.status}`}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: executionResult.status === 'success' ? 'var(--color-success)' : 'var(--color-error)' }}>
                {executionResult.status === 'success' ? '✓ Execution Successful' : 
                 executionResult.status === 'compilation_error' ? 'Compilation Error' : 
                 executionResult.status === 'runtime_error' ? 'Runtime Error' : 
                 executionResult.status === 'timeout' ? 'Execution Timed Out' : 
                 executionResult.status === 'output_limit' ? 'Output Limit Exceeded' : 
                 'Execution Failed'}
              </div>
              
              {executionResult.stdout && (
                <>
                  <div style={{ fontWeight: '600', marginTop: '12px', color: 'var(--color-text)' }}>Output:</div>
                  <pre style={{ background: 'var(--color-surface-2)', padding: '8px', borderRadius: '4px', marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--color-text)' }}>
                    {executionResult.stdout}
                  </pre>
                </>
              )}
              
              {executionResult.stderr && (
                <>
                  <div style={{ fontWeight: '600', marginTop: '12px', color: 'var(--color-text)' }}>Error:</div>
                  <pre style={{ background: 'var(--color-surface-2)', padding: '8px', borderRadius: '4px', marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--color-error)' }}>
                    {executionResult.stderr}
                  </pre>
                </>
              )}
              
              {executionResult.execution_time_ms !== undefined && executionResult.execution_time_ms >= 0 && (
                <div style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--color-muted)' }}>
                  Execution Time: {executionResult.execution_time_ms} ms
                </div>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
