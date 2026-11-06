'use client';

import { useState, type FormEvent } from 'react';

export default function ContactForm() {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = new FormData(event.currentTarget);
    const payload = {
      name: String(values.get('name') ?? ''),
      email: String(values.get('email') ?? ''),
      service: String(values.get('service') ?? ''),
      message: String(values.get('message') ?? ''),
      website: String(values.get('website') ?? ''),
    };
    if (payload.website) return;
    const message = `Name: ${payload.name}\nEmail: ${payload.email}\nService: ${payload.service}\n\n${payload.message}`;
    window.open(
      `https://wa.me/918921533894?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    );
    setPending(true);
    setStatus('Your message is ready in WhatsApp. Saving your inquiry…');
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setStatus('Please send your message in WhatsApp. A website copy could not be saved.');
        return;
      }
      setStatus('Your inquiry has been saved. You can also continue the conversation in WhatsApp.');
    } catch {
      setStatus('Please send your message in WhatsApp. A website copy could not be saved.');
    } finally {
      setPending(false);
    }
  }

  // Autofill extensions can inject attributes before hydration. Limit suppression
  // to native form controls so the rest of the page retains hydration checks.
  return (
    <form id="contact-form" className="reveal" onSubmit={submit}>
      <div className="form-pair">
        <label>
          Your name
          <input
            suppressHydrationWarning
            name="name"
            autoComplete="name"
            minLength={2}
            maxLength={120}
            required
            placeholder="Full name"
          />
        </label>
        <label>
          Email address
          <input
            suppressHydrationWarning
            type="email"
            name="email"
            autoComplete="email"
            maxLength={254}
            required
            placeholder="you@example.com"
          />
        </label>
      </div>
      <label>
        What are you planning?
        <select name="service" required defaultValue="" suppressHydrationWarning>
          <option value="">Select an area of interest</option>
          <option>Architecture</option>
          <option>Interior design</option>
          <option>Landscape design</option>
        </select>
      </label>
      <label>
        A little about your project
        <textarea
          suppressHydrationWarning
          name="message"
          rows={4}
          minLength={10}
          maxLength={5000}
          required
          placeholder="Your idea, location, and anything else you would like to share…"
        />
      </label>
      <div hidden aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" suppressHydrationWarning />
        </label>
      </div>
      <p className="form-note">
        We use your details to respond to your inquiry. Continue to WhatsApp to send your message
        directly.
      </p>
      <button className="submit-button" type="submit" disabled={pending} suppressHydrationWarning>
        {pending ? 'Saving inquiry…' : 'Continue to WhatsApp'}{' '}
        <span aria-hidden="true">&#8599;</span>
      </button>
      <p id="form-status" role="status">
        {status}
      </p>
    </form>
  );
}
