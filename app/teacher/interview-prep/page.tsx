"use client";

import { useEffect, useMemo, useState } from "react";
import type { InterviewCategoryWithCount, InterviewQuestion } from "@/types";
import { INTERVIEW_ICON_NAMES, getInterviewIcon } from "@/lib/interviewIcons";

const EMPTY_CATEGORY_FORM = { name: "", slug: "", description: "", icon: INTERVIEW_ICON_NAMES[0], display_order: 0 };
const EMPTY_QUESTION_FORM = { category_id: "", question: "", answer: "", difficulty: "unknown" };

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function TeacherInterviewPrepPage() {
  const [categories, setCategories] = useState<InterviewCategoryWithCount[]>([]);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);

  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION_FORM);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);

  async function loadCategories() {
    setLoadingCategories(true);
    const res = await fetch("/api/interview-prep/categories");
    const data = await res.json();
    const list: InterviewCategoryWithCount[] = data.categories ?? [];
    setCategories(list);
    if (!selectedCategory && list.length) setSelectedCategory(list[0].id);
    setLoadingCategories(false);
  }

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCategory) {
      setQuestions([]);
      return;
    }
    setLoadingQuestions(true);
    fetch(`/api/interview-prep/questions?categoryId=${selectedCategory}`)
      .then((r) => r.json())
      .then((d) => setQuestions(d.questions ?? []))
      .finally(() => setLoadingQuestions(false));
  }, [selectedCategory]);

  const selectedCategoryName = useMemo(
    () => categories.find((c) => c.id === selectedCategory)?.name ?? "",
    [categories, selectedCategory]
  );

  const answerWordCount = useMemo(
    () => questionForm.answer.trim().split(/\s+/).filter(Boolean).length,
    [questionForm.answer]
  );

  function cancelCategoryEdit() {
    setEditingCategoryId(null);
    setCategoryForm(EMPTY_CATEGORY_FORM);
    setCategoryError(null);
  }

  async function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault();
    setCategoryError(null);
    setSavingCategory(true);
    try {
      const payload = { ...categoryForm, slug: categoryForm.slug || slugify(categoryForm.name) };
      const res = await fetch("/api/interview-prep/categories", {
        method: editingCategoryId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCategoryId ? { id: editingCategoryId, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      cancelCategoryEdit();
      await loadCategories();
    } catch (err: any) {
      setCategoryError(err.message);
    } finally {
      setSavingCategory(false);
    }
  }

  function startCategoryEdit(c: InterviewCategoryWithCount) {
    setEditingCategoryId(c.id);
    setCategoryForm({ name: c.name, slug: c.slug, description: c.description ?? "", icon: c.icon, display_order: c.display_order });
  }

  async function handleCategoryDelete(id: string) {
    if (!confirm("Delete this category? All its questions go with it. This can't be undone.")) return;
    await fetch("/api/interview-prep/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (selectedCategory === id) setSelectedCategory("");
    await loadCategories();
  }

  function cancelQuestionEdit() {
    setEditingQuestionId(null);
    setQuestionForm({ ...EMPTY_QUESTION_FORM, category_id: selectedCategory });
    setQuestionError(null);
  }

  async function handleQuestionSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQuestionError(null);
    setSavingQuestion(true);
    try {
      const payload = { ...questionForm, category_id: questionForm.category_id || selectedCategory };
      const res = await fetch("/api/interview-prep/questions", {
        method: editingQuestionId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingQuestionId ? { id: editingQuestionId, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      cancelQuestionEdit();
      const res2 = await fetch(`/api/interview-prep/questions?categoryId=${selectedCategory}`);
      const d2 = await res2.json();
      setQuestions(d2.questions ?? []);
      await loadCategories();
    } catch (err: any) {
      setQuestionError(err.message);
    } finally {
      setSavingQuestion(false);
    }
  }

  function startQuestionEdit(q: InterviewQuestion) {
    setEditingQuestionId(q.id);
    setQuestionForm({ category_id: q.category_id, question: q.question, answer: q.answer, difficulty: q.difficulty });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleQuestionDelete(id: string) {
    if (!confirm("Delete this question? This can't be undone.")) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    await fetch("/api/interview-prep/questions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadCategories();
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Interview preparation</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Manage categories and author important topics with in-depth explanations (200+ words each) for students to study.
        </p>
      </div>

      {/* ---------- Categories ---------- */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-fg">Categories</h2>

        <form onSubmit={handleCategorySubmit} className="card space-y-3 p-4">
          {editingCategoryId && (
            <div className="flex items-center justify-between rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
              Editing a category
              <button type="button" onClick={cancelCategoryEdit} className="underline">Cancel</button>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Name</label>
              <input
                className="input"
                placeholder="C++"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Slug (URL)</label>
              <input
                className="input"
                placeholder={slugify(categoryForm.name) || "cpp"}
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Icon</label>
              <select
                className="input"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm((f) => ({ ...f, icon: e.target.value }))}
              >
                {INTERVIEW_ICON_NAMES.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Display order</label>
              <input
                type="number"
                className="input"
                value={categoryForm.display_order}
                onChange={(e) => setCategoryForm((f) => ({ ...f, display_order: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Description (optional)</label>
            <input
              className="input"
              placeholder="Common C++ interview questions"
              value={categoryForm.description}
              onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <button className="btn-primary" disabled={savingCategory}>
            {savingCategory ? "Saving..." : editingCategoryId ? "Save changes" : "Add category"}
          </button>
          {categoryError && <p className="text-sm text-red-400">{categoryError}</p>}
        </form>

        {loadingCategories && <p className="text-sm text-fg-muted">Loading…</p>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => {
            const Icon = getInterviewIcon(c.icon);
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`card cursor-pointer p-4 transition-colors ${
                  selectedCategory === c.id ? "border-accent/60" : "hover:border-line"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-accent" />
                    <p className="font-medium text-fg">{c.name}</p>
                  </div>
                  <div className="flex shrink-0 gap-2 text-xs">
                    <button onClick={(e) => { e.stopPropagation(); startCategoryEdit(c); }} className="text-fg-muted hover:text-fg">
                      Edit
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleCategoryDelete(c.id); }} className="text-fg-subtle hover:text-red-400">
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-fg-subtle">{c.question_count} topic{c.question_count === 1 ? "" : "s"}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- Questions ---------- */}
      <section className="space-y-4 border-t border-line/70 pt-8">
        <h2 className="text-sm font-medium text-fg">
          Topics {selectedCategoryName && <span className="text-fg-muted">— {selectedCategoryName}</span>}
        </h2>

        {!selectedCategory && <p className="text-sm text-fg-subtle">Pick a category above to manage its topics.</p>}

        {selectedCategory && (
          <>
            <form onSubmit={handleQuestionSubmit} className="card space-y-3 p-4">
              {editingQuestionId && (
                <div className="flex items-center justify-between rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
                  Editing a topic
                  <button type="button" onClick={cancelQuestionEdit} className="underline">Cancel</button>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs text-fg-muted">Topic</label>
                <textarea
                  className="input min-h-[60px]"
                  placeholder="Encapsulation"
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm((f) => ({ ...f, question: e.target.value }))}
                />
              </div>
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <label className="block text-xs text-fg-muted">Explanation</label>
                  <span className={`text-xs ${answerWordCount > 0 && answerWordCount < 200 ? "text-warn" : "text-fg-subtle"}`}>
                    {answerWordCount} word{answerWordCount === 1 ? "" : "s"}{answerWordCount < 200 ? " (aim for 200+)" : ""}
                  </span>
                </div>
                <textarea
                  className="input min-h-[180px] text-sm"
                  placeholder="Write a thorough, exam-ready explanation of this topic — at least 200 words covering what it is, why it matters, and a concrete example..."
                  value={questionForm.answer}
                  onChange={(e) => setQuestionForm((f) => ({ ...f, answer: e.target.value }))}
                />
              </div>
              <div className="max-w-[200px]">
                <label className="mb-1 block text-xs text-fg-muted">Difficulty</label>
                <select
                  className="input"
                  value={questionForm.difficulty}
                  onChange={(e) => setQuestionForm((f) => ({ ...f, difficulty: e.target.value }))}
                >
                  <option value="unknown">Unspecified</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <button className="btn-primary" disabled={savingQuestion}>
                {savingQuestion ? "Saving..." : editingQuestionId ? "Save changes" : "Add topic"}
              </button>
              {questionError && <p className="text-sm text-red-400">{questionError}</p>}
            </form>

            {loadingQuestions && <p className="text-sm text-fg-muted">Loading…</p>}
            {!loadingQuestions && questions.length === 0 && (
              <p className="card p-6 text-center text-sm text-fg-muted">No topics yet — add one above.</p>
            )}

            <div className="space-y-3">
              {questions.map((q) => (
                <div key={q.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {q.difficulty !== "unknown" && <span className="text-xs capitalize text-fg-muted">{q.difficulty}</span>}
                      {q.created_by_name && <span className="text-xs text-fg-subtle">Added by {q.created_by_name}</span>}
                    </div>
                    <p className="mt-1 font-medium text-fg">{q.question}</p>
                    <p className="mt-2 whitespace-pre-wrap text-xs text-fg-muted">{q.answer}</p>
                  </div>
                  <div className="flex shrink-0 gap-3 text-xs">
                    <button onClick={() => startQuestionEdit(q)} className="text-fg-muted hover:text-fg">Edit</button>
                    <button onClick={() => handleQuestionDelete(q.id)} className="text-fg-subtle hover:text-red-400">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
