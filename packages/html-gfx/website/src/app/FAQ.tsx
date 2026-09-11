const FAQS = [
  {
    question: 'What is this?',
    answer: 'A tool for designing simple, shareable graphics in a live editor.',
  },
  {
    question: 'What file formats can I export?',
    answer:
      'PNG, JPG, WebP, or the raw HTML behind your graphic — plus YAML to save and reload your editor state.',
  },
  {
    question: 'Is my work saved anywhere?',
    answer:
      "Your editor state is automatically saved to your browser's local storage, so a refresh won't lose your progress. You can also export a YAML snapshot to back up or move your work.",
  },
  {
    question: 'How are the images generated?',
    answer:
      "A headless Chrome instance (via Puppeteer) screenshots the exact HTML you're editing, so the preview matches the final export.",
  },
] as const

export function FAQ() {
  return (
    <section>
      <h2 className="text-2xl font-semibold">FAQ</h2>
      <div className="mt-6 flex flex-col gap-5">
        {FAQS.map((faq) => (
          <div key={faq.question}>
            <h3 className="font-medium">{faq.question}</h3>
            <p className="mt-1 text-sm text-gray-400">{faq.answer}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
