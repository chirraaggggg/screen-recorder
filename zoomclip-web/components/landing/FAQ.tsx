'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'Does my video get uploaded to a server?',
    answer:
      'No. Everything runs in your browser using WebAssembly. Your video never leaves your device.',
  },
  {
    question: 'Does it work on Windows and Linux?',
    answer:
      'Yes. ZoomClip is a Chrome extension, so it works on any OS that runs Chrome — Mac, Windows, Linux.',
  },
  {
    question: 'How does auto-zoom work?',
    answer:
      'When you start recording, ZoomClip tracks every click with a precise timestamp. When you stop, the editor applies spring-physics zoom animations centered on each click.',
  },
  {
    question: "What's the difference between Free and Pro?",
    answer:
      'Free gets you 5 exports/month at 720p with a watermark. Pro is unlimited exports, 1080p/4K, no watermark, and all background types.',
  },
  {
    question: 'Can I record full screen or just a tab?',
    answer:
      'Currently ZoomClip records browser tabs. Full-screen and window recording is coming soon.',
  },
  {
    question: 'What video formats are supported?',
    answer:
      'Export to MP4 (H.264) or animated GIF. Input: WebM from the Chrome extension.',
  },
];

function AccordionItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 0',
          background: 'transparent',
          border: 'none',
          color: isOpen ? 'var(--text)' : 'var(--muted)',
          fontSize: 15,
          fontWeight: 500,
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'color 0.15s ease',
        }}
      >
        {item.question}
        <span style={{ fontSize: 18, marginLeft: 12, flexShrink: 0 }}>{isOpen ? '−' : '+'}</span>
      </button>
      <div
        style={{
          maxHeight: isOpen ? 200 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div
          style={{
            paddingBottom: 20,
            fontSize: 14,
            color: 'var(--muted)',
            lineHeight: 1.7,
          }}
        >
          {item.answer}
        </div>
      </div>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section style={{ padding: '120px 0', maxWidth: 700, margin: '0 auto' }}>
      <h2
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: 'var(--text)',
          textAlign: 'center',
          marginBottom: 60,
        }}
      >
        Frequently asked questions
      </h2>
      <div>
        {faqs.map((faq, index) => (
          <AccordionItem
            key={index}
            item={faq}
            isOpen={openIndex === index}
            onToggle={() => setOpenIndex(openIndex === index ? null : index)}
          />
        ))}
      </div>
    </section>
  );
}
