import React, { useState, useEffect } from 'react';
import { Sparkles, Send, CheckCircle2 } from 'lucide-react';

export default function AnswerForm({ roundLetter, onSubmit, isSubmitted, answers, setAnswers }) {

  const categories = [
    { key: 'name', label: 'Person Name', placeholder: 'Type a name...' },
    { key: 'place', label: 'Place / City / Country', placeholder: 'Type a place...' },
    { key: 'animal', label: 'Animal', placeholder: 'Type an animal...' },
    { key: 'thing', label: 'Object / Thing', placeholder: 'Type a thing...' }
  ];

  const handleChange = (key, value) => {
    if (isSubmitted) return;
    setAnswers(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitted) return;
    onSubmit(answers);
  };

  const isValidLetter = (val) => {
    if (!val) return null;
    return val.trim().charAt(0).toUpperCase() === roundLetter.toUpperCase();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {categories.map((cat) => {
          const val = answers[cat.key];
          const valid = isValidLetter(val);

          return (
            <div key={cat.key} className="glass rounded-2xl p-5 relative overflow-hidden transition-all duration-300 border border-indigo-500/15 focus-within:border-indigo-500/60 focus-within:shadow-[0_0_20px_rgba(99,102,241,0.15)]">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold tracking-wide text-slate-300">
                  {cat.label}
                </label>
                {valid === true && (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={12} /> Matches '{roundLetter}'
                  </span>
                )}
                {valid === false && (
                  <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                    Must start with '{roundLetter}'
                  </span>
                )}
              </div>

              <input
                type="text"
                disabled={isSubmitted}
                value={val}
                onChange={(e) => handleChange(cat.key, e.target.value)}
                placeholder={cat.placeholder}
                className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-lg font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-slate-900/80 disabled:opacity-55 transition-all"
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-3">
        <button
          type="submit"
          disabled={isSubmitted}
          className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl btn-gaming transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {isSubmitted ? (
            <>
              <CheckCircle2 className="animate-bounce" size={20} />
              Answer Submitted. Waiting for others...
            </>
          ) : (
            <>
              <Send size={20} />
              Submit Answers
            </>
          )}
        </button>
      </div>
    </form>
  );
}
