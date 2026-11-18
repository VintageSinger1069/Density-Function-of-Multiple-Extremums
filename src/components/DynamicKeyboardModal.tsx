import React, { useState, useRef, useEffect } from 'react';
import { FailureDataPoint, ComponentFailureUnit } from '../types/reliability';
import {
  Terminal,
  Keyboard,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Check,
  X,
  FileCode,
  ArrowRight,
  ListOrdered,
  HelpCircle,
} from 'lucide-react';

interface DynamicKeyboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (points: FailureDataPoint[], unit: ComponentFailureUnit) => void;
  currentUnit: ComponentFailureUnit;
}

// Author's reference dataset from Dynamic Data Entry PDF (Mechanism Analysis with No = 86)
const MECHANISM_PRESET = {
  n: 13,
  No: 86,
  times: [18000, 27000, 35000, 39500, 46000, 58000, 79000, 105000, 125000, 142000, 154000, 168000, 185000],
  failures: [2, 4, 9, 11, 6, 3, 2, 4, 8, 15, 12, 7, 3],
};

export const DynamicKeyboardModal: React.FC<DynamicKeyboardModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
  currentUnit,
}) => {
  const [entryMode, setEntryMode] = useState<'cli' | 'grid'>('cli');

  // CLI state machine
  // phase: 'prompt_n' | 'prompt_x' | 'prompt_nsdx' | 'done'
  const [phase, setPhase] = useState<'prompt_n' | 'prompt_x' | 'prompt_nsdx' | 'done'>('prompt_n');
  const [dataLengthN, setDataLengthN] = useState<number>(13);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [inputVal, setInputVal] = useState<string>('');
  const [xValues, setXValues] = useState<number[]>([]);
  const [nsdxValues, setNsdxValues] = useState<number[]>([]);
  const [cliHistory, setCliHistory] = useState<string[]>([
    '% This Program has been Developed by Mohammed Lamine MOUSSAOUI',
    '% Failure Analysis of a Mechanism',
    '% A Five Order Polynomial is used in the Nonlinear Regression Process',
    'format short;',
  ]);

  const [inputError, setInputError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-focus input
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, phase, currentIdx, entryMode]);

  // Scroll to bottom of terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cliHistory, phase]);

  if (!isOpen) return null;

  // Handle CLI entry commit (Enter key)
  const handleCliSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);
    const trimmed = inputVal.trim();
    if (!trimmed) return;

    const num = parseFloat(trimmed);
    if (isNaN(num)) {
      setInputError('Please enter a valid numeric value.');
      return;
    }

    if (phase === 'prompt_n') {
      const nInt = Math.round(num);
      if (nInt < 4 || nInt > 50) {
        setInputError('Data length n must be between 4 and 50 points.');
        return;
      }
      setDataLengthN(nInt);
      setXValues([]);
      setNsdxValues([]);
      setCurrentIdx(0);
      setCliHistory((prev) => [
        ...prev,
        `n=input(' Data length :'); -> ${nInt}`,
        "display(' Failures Data Input ');",
        "display(' Time(hours) :');",
      ]);
      setPhase('prompt_x');
      setInputVal('');
      return;
    }

    if (phase === 'prompt_x') {
      if (num <= 0) {
        setInputError('Time must be a positive number.');
        return;
      }
      // Check ascending order recommendation
      if (xValues.length > 0 && num <= xValues[xValues.length - 1]) {
        // Warning but allowed or auto-sorted
      }

      const nextX = [...xValues, num];
      setXValues(nextX);
      setCliHistory((prev) => [...prev, ` x(${currentIdx + 1}) = ${num}`]);

      if (currentIdx + 1 < dataLengthN) {
        setCurrentIdx(currentIdx + 1);
        setInputVal('');
      } else {
        // Completed all x, transition to Nsdx
        setCurrentIdx(0);
        setCliHistory((prev) => [
          ...prev,
          "display(' Failures:');",
        ]);
        setPhase('prompt_nsdx');
        setInputVal('');
      }
      return;
    }

    if (phase === 'prompt_nsdx') {
      const count = Math.round(num);
      if (count < 1) {
        setInputError('Failure count must be at least 1.');
        return;
      }

      const nextNsdx = [...nsdxValues, count];
      setNsdxValues(nextNsdx);
      setCliHistory((prev) => [...prev, ` Nsdx(${currentIdx + 1}) = ${count}`]);

      if (currentIdx + 1 < dataLengthN) {
        setCurrentIdx(currentIdx + 1);
        setInputVal('');
      } else {
        // Completed!
        const totalNo = nextNsdx.reduce((acc, c) => acc + c, 0);
        setCliHistory((prev) => [
          ...prev,
          `% Dynamic Keyboard Data Entry Complete!`,
          `No = ${totalNo} total failures across ${dataLengthN} intervals.`,
          `Ready to compute Deltax, Ns, R(x), F(x), f(x), Lambda(x), and Theta_m.`,
        ]);
        setPhase('done');
        setInputVal('');
      }
    }
  };

  // Quick-load author's mechanism sample (No=86)
  const handleLoadAuthorMechanism = () => {
    setDataLengthN(MECHANISM_PRESET.n);
    setXValues(MECHANISM_PRESET.times);
    setNsdxValues(MECHANISM_PRESET.failures);
    setCliHistory([
      '% This Program has been Developed by Mohammed Lamine MOUSSAOUI',
      '% Failure Analysis of a Mechanism',
      '% A Five Order Polynomial is used in the Nonlinear Regression Process',
      'format short;',
      `n=input(' Data length :'); -> ${MECHANISM_PRESET.n}`,
      "display(' Failures Data Input ');",
      "display(' Time(hours) :');",
      ...MECHANISM_PRESET.times.map((t, idx) => ` x(${idx + 1}) = ${t}`),
      "display(' Failures:');",
      ...MECHANISM_PRESET.failures.map((f, idx) => ` Nsdx(${idx + 1}) = ${f}`),
      '% Author Mechanism Dataset (No = 86) Loaded successfully!',
      `No = 86 ; Ready to compute smooth polynomial and MTBF.`,
    ]);
    setPhase('done');
    setInputVal('');
  };

  // Reset CLI
  const handleReset = () => {
    setPhase('prompt_n');
    setCurrentIdx(0);
    setInputVal('');
    setXValues([]);
    setNsdxValues([]);
    setInputError(null);
    setCliHistory([
      '% This Program has been Developed by Mohammed Lamine MOUSSAOUI',
      '% Failure Analysis of a Mechanism',
      '% A Five Order Polynomial is used in the Nonlinear Regression Process',
      'format short;',
    ]);
  };

  // Apply to parent application
  const handleApply = () => {
    if (xValues.length < 4 || xValues.length !== nsdxValues.length) {
      alert('Please enter at least 4 failure data points with corresponding counts.');
      return;
    }

    const points: FailureDataPoint[] = xValues.map((t, idx) => ({
      id: `moussaoui_dyn_${idx}_${Date.now()}`,
      time: t,
      count: nsdxValues[idx] || 1,
      notes: `Dynamic Input [${idx + 1}/${xValues.length}]`,
    }));

    // Sort ascending by time to ensure Deltax(i) > 0
    points.sort((a, b) => a.time - b.time);

    onApplyData(points, currentUnit);
    onClose();
  };

  // Calculate current summary
  const currentTotalNo = nsdxValues.reduce((acc, c) => acc + c, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 no-print animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-xs">
              <Keyboard className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  Dynamic Data Entry using a Keyboard
                </h3>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  Mohammed Lamine MOUSSAOUI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Interactive MATLAB CLI paradigm from <code>Dynamic_Data_Entry.pdf</code> • Sequential keyboard prompts for arbitrary density estimation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & PDF Reference */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setEntryMode('cli')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                entryMode === 'cli'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Interactive CLI Console</span>
            </button>
            <button
              onClick={() => setEntryMode('grid')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                entryMode === 'grid'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5 text-blue-500" />
              <span>Fast Grid / Keypad View</span>
            </button>

            <button
              onClick={handleLoadAuthorMechanism}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 font-semibold transition"
              title="Load Author Mechanism test sample (No=86, n=13)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>Load Moussaoui Mechanism Sample (No = 86)</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href="/assets/aistudio/Dynamic_Data_Entry_6bcf2148.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold transition shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
              <span>View Dynamic Data Entry PDF</span>
            </a>
            <button
              onClick={handleReset}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium transition"
              title="Reset input sequence"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Modal Main Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 flex flex-col text-slate-100 font-mono text-xs">
          {entryMode === 'cli' ? (
            <div className="flex-1 flex flex-col justify-between space-y-4">
              {/* Terminal Logs Window */}
              <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 shadow-inner flex-1 max-h-[380px] overflow-y-auto space-y-1.5 selection:bg-amber-500 selection:text-slate-950">
                {cliHistory.map((line, idx) => (
                  <div
                    key={idx}
                    className={`${
                      line.startsWith('%')
                        ? 'text-emerald-400'
                        : line.startsWith('display') || line.includes('input(')
                        ? 'text-amber-300 font-semibold'
                        : line.startsWith('No =')
                        ? 'text-purple-300 font-bold'
                        : 'text-slate-300'
                    }`}
                  >
                    {line}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>

              {/* Active Prompt Form */}
              {phase !== 'done' ? (
                <form
                  onSubmit={handleCliSubmit}
                  className="bg-slate-900 rounded-xl p-4 border border-amber-500/40 shadow-lg space-y-3"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center space-x-2 text-amber-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>
                        {phase === 'prompt_n'
                          ? 'Step 1: Enter Number of Intervals (Data Length n)'
                          : phase === 'prompt_x'
                          ? `Step 2: Enter Failure Time x(${currentIdx + 1}) of ${dataLengthN} (hours / cycles)`
                          : `Step 3: Enter Failure Count Nsdx(${currentIdx + 1}) of ${dataLengthN}`}
                      </span>
                    </span>
                    <span className="text-slate-500">
                      Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Enter ↵</kbd> to submit
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-amber-400 font-bold text-sm select-none">
                      {phase === 'prompt_n'
                        ? '>> Data length :'
                        : phase === 'prompt_x'
                        ? `>> x(${currentIdx + 1}) :`
                        : `>> Nsdx(${currentIdx + 1}) :`}
                    </span>
                    <input
                      ref={inputRef}
                      type="number"
                      step="any"
                      autoFocus
                      value={inputVal}
                      onChange={(e) => {
                        setInputVal(e.target.value);
                        setInputError(null);
                      }}
                      placeholder={
                        phase === 'prompt_n'
                          ? 'e.g. 13'
                          : phase === 'prompt_x'
                          ? currentIdx === 0
                            ? 'e.g. 18000'
                            : xValues[currentIdx - 1]
                            ? `> ${xValues[currentIdx - 1]}`
                            : 'Time in hours'
                          : 'Failure count (e.g. 2, 4, 9...)'
                      }
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold text-xs transition flex items-center space-x-1.5 shadow-xs"
                    >
                      <span>Enter</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {inputError && (
                    <div className="text-xs text-red-400 font-sans">{inputError}</div>
                  )}

                  {/* Visual Progress Bar */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <div>
                      {phase === 'prompt_x' && (
                        <span>
                          Time vectors entered: <b>{xValues.length} / {dataLengthN}</b>
                        </span>
                      )}
                      {phase === 'prompt_nsdx' && (
                        <span>
                          Failure counts entered: <b>{nsdxValues.length} / {dataLengthN}</b>
                        </span>
                      )}
                    </div>
                    <div className="w-48 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-500 h-full transition-all duration-300"
                        style={{
                          width: `${
                            phase === 'prompt_n'
                              ? 10
                              : phase === 'prompt_x'
                              ? (xValues.length / (dataLengthN * 2)) * 100
                              : 50 + (nsdxValues.length / (dataLengthN * 2)) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </form>
              ) : (
                <div className="bg-slate-900 rounded-xl p-5 border border-emerald-500/50 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        All {dataLengthN} Vectors Entered Successfully!
                      </h4>
                      <p className="text-slate-400 text-xs font-sans mt-0.5">
                        Total population <b>N₀ = {currentTotalNo}</b> units across domain [
                        {xValues[0]?.toLocaleString()}, {xValues[xValues.length - 1]?.toLocaleString()}]{' '}
                        {currentUnit}.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 shrink-0">
                    <button
                      onClick={handleReset}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
                    >
                      Re-enter Data
                    </button>
                    <button
                      onClick={handleApply}
                      className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition flex items-center space-x-2 shadow-md"
                    >
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>Apply &amp; Fit Polynomial Model</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* FAST GRID / KEYPAD VIEW */
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-800/80 text-amber-400 sticky top-0 border-b border-slate-700">
                    <tr>
                      <th className="px-3 py-2 w-12 text-center">i</th>
                      <th className="px-4 py-2">Failure Time x(i) ({currentUnit})</th>
                      <th className="px-4 py-2 w-32 text-center">Failures Nsdx(i)</th>
                      <th className="px-4 py-2">Interval Δx(i)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {Array.from({ length: Math.max(xValues.length, 1) }).map((_, idx) => {
                      const t = xValues[idx] || 0;
                      const c = nsdxValues[idx] || 0;
                      const prevT = idx > 0 ? xValues[idx - 1] : 0;
                      const delta = idx > 0 ? t - prevT : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="px-3 py-2 text-center text-slate-500">{idx + 1}</td>
                          <td className="px-4 py-2 font-bold text-white">
                            <input
                              type="number"
                              value={t || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const updated = [...xValues];
                                updated[idx] = val;
                                setXValues(updated);
                              }}
                              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 w-36 text-white text-xs"
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <input
                              type="number"
                              value={c || ''}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                const updated = [...nsdxValues];
                                updated[idx] = val;
                                setNsdxValues(updated);
                              }}
                              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 w-20 text-center text-amber-300 text-xs"
                            />
                          </td>
                          <td className="px-4 py-2 text-slate-400">
                            {idx > 0 && delta > 0 ? `+${delta.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-400 text-xs">
                  {xValues.length} rows configured • Total N₀ = {currentTotalNo}
                </span>
                <button
                  onClick={handleApply}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply Data to Analysis</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5 text-slate-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>MATLAB Compatibility: <code>input(' ')</code> vector construct</span>
            </span>
            <span>•</span>
            <span>Model: 5th-Order Polynomial Nonlinear Regression</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
            >
              Cancel
            </button>
            {phase === 'done' && (
              <button
                onClick={handleApply}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition shadow-xs"
              >
                Apply to Workbench
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
